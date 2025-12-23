import {
  RenderElementProps,
  VirtualTree,
  getFolderKeyChanges,
  useTreeData,
} from "@/wab/client/components/grouping/VirtualTree";
import { promptDeleteFolder } from "@/wab/client/components/modals/folderDeletionModal";
import { DataTokenEditModal } from "@/wab/client/components/sidebar/DataTokenEditModal";
import DataTokenRow from "@/wab/client/components/sidebar/DataTokenRow";
import DataTokenTypeHeader from "@/wab/client/components/sidebar/DataTokenTypeHeader";
import MultiAssetsActions from "@/wab/client/components/sidebar/MultiAssetsActions";
import { DataTokenFolderRow } from "@/wab/client/components/sidebar/TokenFolderRow";
import {
  DataTokenFolder,
  DataTokenFolderActions,
  DataTokenPanelRow,
  TOKEN_ROW_HEIGHT,
} from "@/wab/client/components/sidebar/token-utils";
import { Matcher } from "@/wab/client/components/view-common";
import { PlasmicLeftGeneralDataTokensPanel } from "@/wab/client/plasmic/plasmic_kit_left_pane/PlasmicLeftGeneralDataTokensPanel";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  DataTokenType,
  DataTokenValue,
  dataTypes,
  getDataTokenType,
  sortDataTokenCategories,
} from "@/wab/commons/DataToken";
import {
  ensure,
  partitions,
  spawn,
  unexpected,
  unreachable,
} from "@/wab/shared/common";
import {
  finalDataTokensForDep,
  siteFinalDataTokens,
  siteFinalDataTokensDirectDeps,
} from "@/wab/shared/core/site-data-tokens";
import { isHostLessPackage } from "@/wab/shared/core/sites";
import {
  FinalToken,
  MutableToken,
  OverrideableToken,
} from "@/wab/shared/core/tokens";
import {
  Folder as InternalFolder,
  createFolderTreeStructure,
  getFolderTrimmed,
  getFolderWithSlash,
  isFolder,
  replaceFolderName,
} from "@/wab/shared/folders/folders-util";
import { DataToken, ProjectDependency } from "@/wab/shared/model/classes";
import { naturalSort } from "@/wab/shared/sort";
import { debounce, groupBy } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";

// Data Token Controls Context
type DataTokenControlsContextValue = {
  onDuplicate: (token: DataToken) => Promise<void>;
  onSelect: (
    token: MutableToken<DataToken> | OverrideableToken<DataToken>
  ) => void;
  onAdd: (tokenType: DataTokenType, folderName?: string) => Promise<void>;
  expandedHeaders: Set<DataTokenType>;
  setExpandedHeaders: React.Dispatch<React.SetStateAction<Set<DataTokenType>>>;
};

export const DataTokenControlsContext =
  React.createContext<DataTokenControlsContextValue | null>(null);

export function useDataTokenControls() {
  return ensure(
    React.useContext(DataTokenControlsContext),
    "useDataTokenControls must be used within a DataTokenControlsContext.Provider"
  );
}

interface DataTokenToPanelRowProps {
  item: FinalToken<DataToken> | InternalFolder<FinalToken<DataToken>>;
  category: DataTokenType;
  actions?: DataTokenFolderActions;
  dep?: ProjectDependency;
}

function mapToDataTokenPanelRow({
  item,
  category,
  actions,
  dep,
}: DataTokenToPanelRowProps): DataTokenPanelRow {
  if (!isFolder(item)) {
    return {
      type: "token" as const,
      key: item.uuid,
      token: item,
      value: item.value as DataTokenValue,
      importedFrom: dep?.projectId,
    };
  }

  return {
    type: "folder-token" as const,
    tokenType: category,
    key: item.path,
    name: item.name,
    path: item.path,
    items: item.items.map((i) =>
      mapToDataTokenPanelRow({ item: i, category, dep, actions })
    ),
    count: item.count,
    actions,
  };
}

const LeftGeneralDataTokensPanel = observer(
  function LeftGeneralDataTokensPanel() {
    const studioCtx = useStudioCtx();
    const [debouncedQuery, setDebouncedQuery] = React.useState("");
    const debouncedSetQuery = React.useCallback(
      debounce((value: string) => {
        setDebouncedQuery(value);
      }, 500),
      [setDebouncedQuery]
    );
    const [expandedHeaders, setExpandedHeaders] = React.useState<
      Set<DataTokenType>
    >(new Set());
    const matcher = new Matcher(debouncedQuery);

    const [justAdded, setJustAdded] = React.useState<DataToken | undefined>(
      undefined
    );

    const [editToken, setEditToken] = React.useState<
      MutableToken<DataToken> | OverrideableToken<DataToken> | undefined
    >(undefined);

    const getRowKey = React.useCallback((row: DataTokenPanelRow) => {
      return row.key;
    }, []);
    const getRowChildren = React.useCallback((row: DataTokenPanelRow) => {
      if (row.type === "token") {
        return [];
      }
      return row.items;
    }, []);
    const getRowSearchText = React.useCallback((row: DataTokenPanelRow) => {
      switch (row.type) {
        case "header":
          return dataTypes[row.tokenType].label;
        case "folder":
        case "folder-token":
          return row.name;
        case "token":
          return `${row.token.name}$${row.value}`;
        default:
          unexpected();
      }
    }, []);
    const getRowHeight = React.useCallback((row: DataTokenPanelRow) => {
      if (row.type === "header") {
        return 42;
      }
      return TOKEN_ROW_HEIGHT;
    }, []);

    const onAddToken = React.useCallback(
      async (type: DataTokenType, folderName?: string) => {
        const folderPath = getFolderWithSlash(folderName);

        await studioCtx.change(({ success }) => {
          const token = studioCtx.tplMgr().addDataToken({
            prefix: folderPath,
            value: dataTypes[type].defaultSerializedValue,
          });
          setJustAdded(token);
          setEditToken(new MutableToken(token));
          return success();
        });
      },
      [studioCtx, setJustAdded, setEditToken]
    );

    const getFolderTokens = (
      items: DataTokenPanelRow[]
    ): {
      tokens: DataToken[];
      folders: DataTokenFolder[];
    } => {
      const tokens: DataToken[] = [];
      const folders: DataTokenFolder[] = [];

      for (const item of items) {
        switch (item.type) {
          case "folder":
          case "folder-token": {
            folders.push(item);
            const children = getFolderTokens(item.items);
            tokens.push(...children.tokens);
            folders.push(...children.folders);
            break;
          }
          case "token":
            tokens.push(item.token.base);
            break;
          case "header":
            break;
        }
      }
      return { tokens, folders };
    };

    const onDeleteFolder = React.useCallback(
      async (folder: DataTokenFolder) => {
        const confirmation = await promptDeleteFolder(
          "data token",
          getFolderWithSlash(folder.name),
          folder.count
        );
        if (confirmation) {
          const { tokens } = getFolderTokens([folder]);
          await studioCtx.siteOps().tryDeleteDataTokens(tokens);
        }
      },
      [studioCtx]
    );

    const onFolderRenamed = React.useCallback(
      async (folder: DataTokenFolder, newName: string) => {
        const pathData = replaceFolderName(folder.key, newName);
        const { tokens, folders } = getFolderTokens([folder]);

        await studioCtx.changeUnsafe(() => {
          const { oldPath, newPath } = pathData;
          for (const token of tokens) {
            const oldTokenName = token.name;
            const newTokenName = oldTokenName.replace(oldPath, newPath);
            studioCtx
              .tplMgr()
              .renameDataToken(studioCtx.siteInfo.id, token, newTokenName);
          }
        });
        const keyChanges = getFolderKeyChanges(folders, pathData);
        renameGroup(keyChanges);
      },
      [studioCtx]
    );

    const actions: DataTokenFolderActions = React.useMemo(
      () => ({
        onAddToken,
        onDeleteFolder,
        onFolderRenamed,
      }),
      [onAddToken, onDeleteFolder, onFolderRenamed]
    );

    const onDuplicate = React.useCallback(
      async (token: DataToken) => {
        await studioCtx.change(({ success }) => {
          const newToken = studioCtx.tplMgr().duplicateDataToken(token);
          setJustAdded(newToken);
          setEditToken(new MutableToken(newToken));
          return success();
        });
      },
      [studioCtx, setJustAdded, setEditToken]
    );

    const onSelect = React.useCallback(
      (token: MutableToken<DataToken> | OverrideableToken<DataToken>) => {
        setEditToken(token);
      },
      [setEditToken]
    );

    const tokensByCategory = groupBy(
      siteFinalDataTokensDirectDeps(studioCtx.site),
      (t) => getDataTokenType(t.value)
    );

    const tokenSectionItems = (category: DataTokenType) => {
      const makeTokensItems = (
        tokens: FinalToken<DataToken>[],
        dep?: ProjectDependency,
        isRegistered = false
      ) => {
        tokens = naturalSort(tokens, (token) => getFolderTrimmed(token.name));
        const depPrefix = dep ? `_${dep.name}` : "";
        const regPrefix = tokens.some((t) => t.isRegistered)
          ? "_registered"
          : "";
        const pathPrefix = `${category}${depPrefix}${regPrefix}`;

        const hasActions = !dep && !isRegistered;
        const tokenTree = createFolderTreeStructure(tokens, {
          pathPrefix,
          getName: (item) => item.name,
          mapper: (item) =>
            mapToDataTokenPanelRow({
              item,
              category,
              dep,
              actions: hasActions ? actions : undefined,
            }),
        });
        return { items: tokenTree, count: tokens.length };
      };

      const makeDepsItems = (
        deps: ProjectDependency[]
      ): DataTokenPanelRow[] => {
        deps = naturalSort(deps, (dep) =>
          studioCtx.projectDependencyManager.getNiceDepName(dep)
        );
        return deps
          .map((dep) => {
            return {
              type: "folder" as const,
              tokenType: category,
              name: studioCtx.projectDependencyManager.getNiceDepName(dep),
              key: `${category}-${dep.uuid}`,
              ...makeTokensItems(
                (isHostLessPackage(dep.site)
                  ? finalDataTokensForDep(studioCtx.site, dep.site)
                  : finalDataTokensForDep(studioCtx.site, dep.site).filter(
                      (t) => !t.isRegistered
                    )
                ).filter((t) => getDataTokenType(t.value) === category),
                dep
              ),
            };
          })
          .filter((dep) => dep.count > 0);
      };

      const [registeredTokens, localTokens] = partitions(
        tokensByCategory[category] ?? [],
        [(t) => t.isRegistered, (t) => t instanceof MutableToken]
      );

      const items: DataTokenPanelRow[] = [
        ...makeTokensItems(localTokens, undefined, false).items,
        ...(registeredTokens.length > 0
          ? [
              {
                type: "folder" as const,
                tokenType: category,
                name: "Registered tokens",
                key: `$${category}-registered-folder`,
                ...makeTokensItems(registeredTokens, undefined, true),
              },
            ]
          : []),
        ...makeDepsItems(
          studioCtx.site.projectDependencies.filter(
            (d) => !isHostLessPackage(d.site)
          )
        ),
        ...makeDepsItems(
          studioCtx.site.projectDependencies.filter((d) =>
            isHostLessPackage(d.site)
          )
        ),
      ];
      const totalCount = items.reduce(
        (acc, item) => (item.type !== "token" ? acc + item.count : acc + 1),
        0
      );
      return { items, count: totalCount };
    };

    const tokensContent = () => {
      const selectableTokens = siteFinalDataTokens(studioCtx.site)
        .filter((t) => {
          return (
            (matcher.matches(t.name) ||
              matcher.matches(t.value) ||
              justAdded === t.base) &&
            !t.isRegistered
          );
        })
        .map((t) => t.uuid);

      const availableCategories = sortDataTokenCategories(
        Object.keys(tokensByCategory) as DataTokenType[]
      );

      const items = availableCategories.map((category): DataTokenPanelRow => {
        return {
          type: "header" as const,
          tokenType: category,
          key: `$${category}-folder`,
          ...tokenSectionItems(category),
        };
      });

      return (
        <MultiAssetsActions
          type="token"
          selectableAssets={selectableTokens}
          onDelete={async (selected: string[]) => {
            const selectedTokens = studioCtx.site.dataTokens.filter((t) =>
              selected.includes(t.uuid)
            );
            return await studioCtx
              .siteOps()
              .tryDeleteDataTokens(selectedTokens);
          }}
        >
          <DataTokenControlsContext.Provider
            value={{
              onDuplicate: onDuplicate,
              onSelect: onSelect,
              onAdd: onAddToken,
              expandedHeaders: expandedHeaders,
              setExpandedHeaders: setExpandedHeaders,
            }}
          >
            <VirtualTree
              rootNodes={items}
              renderElement={DataTokenTreeRow}
              nodeData={nodeData}
              nodeKey={nodeKey}
              nodeHeights={nodeHeights}
              expandAll={expandAll}
              collapseAll={collapseAll}
            />
          </DataTokenControlsContext.Provider>
        </MultiAssetsActions>
      );
    };

    const treeItems: DataTokenPanelRow[] = React.useMemo(() => {
      const availableCategories = sortDataTokenCategories(
        Object.keys(tokensByCategory) as DataTokenType[]
      );
      return availableCategories.map((cat) => {
        const { items: section, count } = tokenSectionItems(cat);
        return {
          type: "header",
          tokenType: cat,
          key: `$${cat}-hdr`,
          items: section,
          count,
        };
      });
    }, [tokensByCategory, tokenSectionItems]);

    const {
      nodeData,
      nodeKey,
      nodeHeights,
      renameGroup,
      expandAll,
      collapseAll,
    } = useTreeData<DataTokenPanelRow>({
      nodes: treeItems,
      query: debouncedQuery,
      renderElement: DataTokenTreeRow,
      getNodeKey: getRowKey,
      getNodeChildren: getRowChildren,
      getNodeSearchText: getRowSearchText,
      getNodeHeight: getRowHeight,
      defaultOpenKeys: "all",
    });

    return (
      <>
        <PlasmicLeftGeneralDataTokensPanel
          newTokenButton={{
            "data-test-id": "new-data-token-button",
            onClick: () => spawn(onAddToken("string")),
          }}
          leftSearchPanel={{
            searchboxProps: {
              onChange: (e) => {
                debouncedSetQuery(e.target.value);
              },
              autoFocus: true,
            },
            expandProps: {
              onClick: expandAll,
              "data-test-id": "data-tokens-panel-expand-all",
            },
            collapseProps: {
              onClick: collapseAll,
            },
          }}
          content={{
            children: <>{tokensContent()}</>,
            "data-test-id": "data-tokens-panel-content",
          }}
        />

        {editToken && (
          <DataTokenEditModal
            token={editToken.base}
            studioCtx={studioCtx}
            defaultEditingName={editToken.base === justAdded}
            onClose={() => {
              setEditToken(undefined);
              setJustAdded(undefined);
            }}
          />
        )}
      </>
    );
  }
);

const DataTokenTreeRow = (props: RenderElementProps<DataTokenPanelRow>) => {
  const { value, treeState } = props;
  switch (value.type) {
    case "header":
      return (
        <DataTokenTypeHeader
          category={value.tokenType}
          isExpanded={treeState.isOpen}
          toggleExpand={treeState.toggleExpand}
          groupSize={value.count}
        />
      );
    case "folder":
    case "folder-token":
      return (
        <DataTokenFolderRow
          folder={value}
          matcher={treeState.matcher}
          isOpen={treeState.isOpen}
          indentMultiplier={treeState.level - 1}
          toggleExpand={treeState.toggleExpand}
        />
      );
    case "token":
      return (
        <DataTokenRow
          token={value.token}
          tokenValue={value.value}
          matcher={treeState.matcher}
          indentMultiplier={treeState.level - 1}
        />
      );
    default:
      unreachable(value);
  }
};

export default LeftGeneralDataTokensPanel;
