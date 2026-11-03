import { RenameArenaProps } from "@/wab/client/commands/arena/renameArena";
import { COMMANDS } from "@/wab/client/commands/command";
import {
  RenderElementProps,
  VirtualTree,
  getFolderKeyChanges,
  useTreeData,
} from "@/wab/client/components/grouping/VirtualTree";
import { KeyboardShortcut } from "@/wab/client/components/menu-builder";
import { promptDeleteFolder } from "@/wab/client/components/modals/folderDeletionModal";
import { deleteArenas } from "@/wab/client/components/sidebar-tabs/ProjectPanel/ArenaContextMenu";
import {
  ArenaData,
  ArenaFolderActions,
  ArenaPanelRow,
  ComponentArenaData,
  CustomArenaData,
  FolderElement,
  HEADER_HEIGHT,
  NavigationAnyRow,
  NavigationArenaRow,
  NavigationFolderRow,
  NavigationHeaderRow,
  PAGE_HEIGHT,
  PageArenaData,
  ROW_HEIGHT,
  getArenaDisplay,
} from "@/wab/client/components/sidebar-tabs/ProjectPanel/NavigationRows";
import styles from "@/wab/client/components/sidebar-tabs/ProjectPanel/ProjectPanelTop.module.scss";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import { ListStack } from "@/wab/client/components/widgets/ListStack";
import { NewComponentInfo } from "@/wab/client/components/widgets/NewComponentModal";
import {
  buildInsertableExtraInfo,
  getScreenVariantToInsertableTemplate,
  replaceWithPageTemplate,
} from "@/wab/client/insertable-templates";
import PlasmicNavigationDropdown from "@/wab/client/plasmic/plasmic_kit_project_panel/PlasmicNavigationDropdown";
import {
  promptComponentTemplate,
  promptPageTemplate,
} from "@/wab/client/prompts";
import { getComboForAction } from "@/wab/client/shortcuts/studio/studio-shortcuts";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { testIds } from "@/wab/client/test-ids";
import { ArenaType, isArenaType } from "@/wab/shared/ApiSchema";
import { AnyArena, getArenaName } from "@/wab/shared/Arenas";
import { ARENAS_DESCRIPTION, ARENA_LOWER } from "@/wab/shared/Labels";
import {
  assert,
  spawn,
  switchType,
  unreachable,
  withoutNils,
} from "@/wab/shared/common";
import { ComponentType, PageComponent } from "@/wab/shared/core/components";
import {
  Folder as InternalFolder,
  createFolderTreeStructure,
  getFolderTrimmed,
  getFolderWithSlash,
  isFolder,
  replaceFolderName,
} from "@/wab/shared/folders/folders-util";
import { InsertableTemplateComponentExtraInfo } from "@/wab/shared/insertable-templates/types";
import { Arena, ComponentArena, PageArena } from "@/wab/shared/model/classes";
import { Dropdown, Menu } from "antd";
import { debounce } from "lodash";
import { observer } from "mobx-react";
import { computedFn } from "mobx-utils";
import { ok } from "neverthrow";
import React from "react";
import { FocusScope } from "react-aria";

function mapToArenaData(
  arena: AnyArena,
  opts: { keyPrefix: string; isStandalone?: boolean } = {
    keyPrefix: "",
    isStandalone: undefined,
  },
): ArenaData {
  return switchType(arena)
    .when(Arena, (i) => ({
      type: "custom" as const,
      key: `${opts.keyPrefix}${i.name}-${i.uid}`,
      arena: i,
      isStandalone: opts.isStandalone,
    }))
    .when(PageArena, (i) => ({
      type: "page" as const,
      key: `${opts.keyPrefix}${i.component.uuid}`,
      arena: i,
      isStandalone: opts.isStandalone,
    }))
    .when(ComponentArena, (i) => ({
      type: "component" as const,
      key: `${opts.keyPrefix}${i.component.uuid}`,
      arena: i,
      isStandalone: opts.isStandalone,
    }))
    .result();
}

interface ArenaToPanelRowProps {
  item: AnyArena | InternalFolder<AnyArena>;
  sectionType: ArenaType;
  actions: ArenaFolderActions;
}

export function mapToArenaPanelRow({
  item,
  sectionType,
  actions,
}: ArenaToPanelRowProps): ArenaPanelRow {
  if (!isFolder(item)) {
    return mapToArenaData(item);
  }
  const type = "folder-element" as const;

  return {
    type,
    key: item.path,
    name: item.name,
    path: item.path,
    sectionType,
    items: item.items.map((i) =>
      mapToArenaPanelRow({
        item: i,
        sectionType,
        actions,
      }),
    ),
    count: item.count,
    actions,
  };
}

interface NavigationDropdownContextValue {
  onClose: () => void;
}
export const NavigationDropdownContext = React.createContext<
  NavigationDropdownContextValue | undefined
>(undefined);

interface NavigationDropdownProps {
  onClose: () => void;
}

export const NavigationDropdown = observer(
  React.forwardRef(NavigationDropdown_),
);

function isArenaRow(
  row: ArenaPanelRow,
): row is ComponentArenaData | CustomArenaData | PageArenaData {
  return (
    row.type === "custom" || row.type === "page" || row.type === "component"
  );
}

function NavigationDropdown_(
  { onClose }: NavigationDropdownProps,
  outerRef: React.Ref<HTMLDivElement>,
) {
  const studioCtx = useStudioCtx();
  const contentEditorMode = studioCtx.contentEditorMode;

  const searchInputRef = studioCtx.projectSearchInputRef;
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const debouncedSetQuery = React.useCallback(
    debounce((value: string) => {
      setDebouncedQuery(value);
    }, 500),
    [setDebouncedQuery],
  );

  const getRowKey = React.useCallback((row: ArenaPanelRow) => {
    return row.key;
  }, []);
  const rowAction = React.useCallback(async (row: ArenaPanelRow) => {
    if (isArenaRow(row)) {
      await navigateToArena(row.arena);
    }
  }, []);
  const getRowChildren = React.useCallback((row: ArenaPanelRow) => {
    if ("items" in row) {
      return row.items;
    }
    return [];
  }, []);
  const getRowSearchText = React.useCallback((row: ArenaPanelRow) => {
    switch (row.type) {
      case "header":
      case "folder-element":
        return typeof row.name === "string" ? row.name : row.key;
      case "custom":
        return row.arena.name;
      case "page":
        return `${row.arena.component.name}-${row.arena.component.pageMeta?.path}`;
      case "component":
        return row.arena.component.name;
      case "any":
        return typeof row.element === "string" ? row.element : row.key;
      default:
        unreachable(row);
    }
  }, []);
  const getRowHeight = React.useCallback((row: ArenaPanelRow) => {
    if (row.type === "header") {
      return HEADER_HEIGHT;
    } else if (row.type === "page") {
      return PAGE_HEIGHT;
    }
    return ROW_HEIGHT;
  }, []);
  const contextValue = React.useMemo((): NavigationDropdownContextValue => {
    return { onClose };
  }, [onClose]);

  const navigateToArena = React.useCallback(
    async (arena: AnyArena) => {
      onClose();
      await COMMANDS.navigation.switchArena.execute(studioCtx, { arena }, {});
    },
    [onClose, studioCtx],
  );

  const onAddArena = async (arenaType: ArenaType, folderName?: string) => {
    onClose();
    let componentInfo: NewComponentInfo | undefined;
    const folderPath = getFolderWithSlash(folderName);

    switch (arenaType) {
      case "custom":
        await studioCtx.changeUnsafe(() => {
          studioCtx.addArena(folderPath);
        });
        break;

      case "component":
        componentInfo = await promptComponentTemplate(studioCtx, folderPath);
        if (!componentInfo) {
          return;
        }
        await studioCtx.changeUnsafe(() => {
          studioCtx.addComponent(componentInfo!.name, {
            type: ComponentType.Plain,
            ...componentInfo,
          });
        });
        break;

      case "page": {
        const chosenTemplate = await promptPageTemplate(studioCtx, folderPath);
        if (!chosenTemplate) {
          return;
        }

        const mkPage = async () =>
          await studioCtx.changeUnsafe<PageComponent>(() => {
            const page_ = studioCtx.addComponent(chosenTemplate.name, {
              type: ComponentType.Page,
            }) as PageComponent;

            if (info) {
              replaceWithPageTemplate(studioCtx, page_, info);
            }

            return page_;
          });

        let info: InsertableTemplateComponentExtraInfo | undefined = undefined;
        switch (chosenTemplate.type) {
          case "blank": {
            await mkPage();
            break;
          }
          case "template": {
            assert(
              chosenTemplate.projectId && chosenTemplate.componentName,
              "",
            );

            const { screenVariant } =
              await getScreenVariantToInsertableTemplate(studioCtx);
            info = await studioCtx.appCtx.app.withSpinner(
              buildInsertableExtraInfo(
                studioCtx,
                chosenTemplate as {
                  projectId: string;
                  componentName: string;
                },
                screenVariant,
              ),
            );

            await mkPage();
            break;
          }
        }
      }
    }
  };

  const getFolderArenas = (
    items: ArenaPanelRow[],
  ): { arenas: AnyArena[]; folders: FolderElement[] } => {
    const arenas: AnyArena[] = [];
    const folders: FolderElement[] = [];

    for (const item of items) {
      switch (item.type) {
        case "folder-element": {
          folders.push(item);
          const children = getFolderArenas(item.items);
          arenas.push(...children.arenas);
          folders.push(...children.folders);
          break;
        }
        case "page":
        case "custom":
        case "component":
          arenas.push(item.arena);
          break;
        default:
          break;
      }
    }
    return { arenas, folders };
  };

  const onDeleteFolder = React.useCallback(
    async (folder: FolderElement) => {
      const confirmation = await promptDeleteFolder(
        getArenaDisplay(folder.sectionType),
        getFolderWithSlash(folder.name),
        folder.count,
      );
      if (confirmation) {
        const { arenas } = getFolderArenas([folder]);
        await deleteArenas(studioCtx, arenas);
      }
    },
    [studioCtx],
  );
  const onFolderRenamed = React.useCallback(
    (folder: FolderElement, newName: string) => {
      const pathData = replaceFolderName(folder.key, newName);
      const { oldPath, newPath } = pathData;
      const { arenas, folders } = getFolderArenas([folder]);

      const renameProps: RenameArenaProps[] = arenas.map((arena) => {
        const oldArenaName = getArenaName(arena);
        const newArenaName = oldArenaName.replace(oldPath, newPath);
        return { arena, newName: newArenaName };
      });

      if (renameProps.length) {
        spawn(
          studioCtx.change(() => {
            studioCtx.siteOps().tryRenameArenas(renameProps);
            return ok();
          }),
        );
        const keyChanges = getFolderKeyChanges(folders, pathData);
        renameGroup(keyChanges);
      }
    },
    [studioCtx],
  );

  const actions: ArenaFolderActions = React.useMemo(
    () => ({
      onAddArena,
      onDeleteFolder,
      onFolderRenamed,
    }),
    [onAddArena, onDeleteFolder, onFolderRenamed],
  );
  const items = buildItems(studioCtx, actions);

  const {
    nodeData,
    nodeKey,
    nodeHeights,
    expandAll,
    collapseAll,
    renameGroup,
    selectNextRow,
  } = useTreeData<ArenaPanelRow>({
    nodes: items,
    query: debouncedQuery,
    renderElement: ArenaTreeRow,
    getNodeKey: getRowKey,
    getNodeChildren: getRowChildren,
    getNodeSearchText: getRowSearchText,
    getNodeHeight: getRowHeight,
    nodeAction: rowAction,
    isNodeSelectable: (row) => isArenaType(row.type),
    defaultOpenKeys: "all",
  });

  return (
    <div className={styles.root} ref={outerRef} {...testIds.projectPanel}>
      <FocusScope contain>
        <PlasmicNavigationDropdown
          // We use pointerEvents:auto here because antd popover has a bug
          // where if it is open/closed quickly it may not remove the
          // `pointerEvents: none` it adds to the popover container
          style={{ zIndex: 0, pointerEvents: "auto" }}
          plusButton={{
            props: {
              id: "nav-dropdown-plus-btn",
              tooltip: contentEditorMode
                ? "Create new page"
                : "Create new page or component",
              onClick: () =>
                contentEditorMode ? onAddArena("page") : undefined,
            },
            wrap: contentEditorMode
              ? undefined
              : (plusButton) => (
                  <Dropdown
                    placement={"bottomRight"}
                    children={plusButton}
                    overlay={
                      <Menu>
                        <Menu.Item onClick={() => onAddArena("page")}>
                          New <strong>page</strong>
                        </Menu.Item>
                        {!contentEditorMode && (
                          <Menu.Item onClick={() => onAddArena("component")}>
                            New <strong>component</strong>
                          </Menu.Item>
                        )}
                        {!contentEditorMode && (
                          <Menu.Item onClick={() => onAddArena("custom")}>
                            <LabelWithDetailedTooltip
                              tooltip={ARENAS_DESCRIPTION}
                            >
                              <span>
                                New <strong>{ARENA_LOWER}</strong>
                              </span>
                            </LabelWithDetailedTooltip>
                          </Menu.Item>
                        )}
                      </Menu>
                    }
                    trigger={["click"]}
                  />
                ),
          }}
          searchInput={{
            props: {
              withShortcut: true,
              shortcut: {
                wrap: () =>
                  debouncedQuery ? null : (
                    <KeyboardShortcut tooltip="Go to page/component">
                      {getComboForAction("SEARCH_PROJECT_ARENAS")}
                    </KeyboardShortcut>
                  ),
              },
              onChange: (e) => {
                debouncedSetQuery(e.target.value);
              },
              onClear: () => setDebouncedQuery(""),
              clearFieldIcon: {
                "data-test-id": "nav-dropdown-clear-search",
              },
              searchInput: {
                ref: searchInputRef,
                autoFocus: true,
                onKeyUp: async (e) => {
                  if (
                    e.key === "Escape" &&
                    debouncedQuery.trim().length === 0
                  ) {
                    onClose();
                  } else if (e.key === "ArrowDown") {
                    selectNextRow(1);
                    e.preventDefault();
                  } else if (e.key === "ArrowUp") {
                    selectNextRow(-1);
                    e.preventDefault();
                  } else if (e.key === "Enter") {
                    const sel = nodeData.treeData.selectedIndex;
                    if (sel !== undefined) {
                      const row = nodeData.treeData.nodes[sel];

                      // If the node is an arena, navigate on Enter
                      if (isArenaType(row.value?.type)) {
                        e.preventDefault();
                        await navigateToArena(row.value.arena);
                      }
                    }
                  }
                },
                "data-test-id": "nav-dropdown-search-input",
              },
            },
          }}
          expandButton={{
            onClick: expandAll,
            "data-test-id": "nav-dropdown-expand-all",
          }}
          collapseButton={{
            onClick: collapseAll,
          }}
        >
          <NavigationDropdownContext.Provider value={contextValue}>
            <ListStack>
              <div style={{ height: 500 }} data-test-id="nav-dropdown-content">
                <VirtualTree
                  rootNodes={items}
                  renderElement={ArenaTreeRow}
                  nodeData={nodeData}
                  nodeKey={nodeKey}
                  nodeHeights={nodeHeights}
                  expandAll={expandAll}
                  collapseAll={collapseAll}
                />
              </div>
            </ListStack>
          </NavigationDropdownContext.Provider>
        </PlasmicNavigationDropdown>
      </FocusScope>
    </div>
  );
}

const buildItems = computedFn(
  (studioCtx: StudioCtx, actions: ArenaFolderActions) => {
    const getSection = (
      title: React.ReactNode,
      arenaSection: ArenaType,
      items: AnyArena[],
    ): ArenaPanelRow => {
      const tree = createFolderTreeStructure(items, {
        pathPrefix: `${title}`,
        getName: (item) => getFolderTrimmed(getArenaName(item)),
        mapper: (item) =>
          mapToArenaPanelRow({ item, sectionType: arenaSection, actions }),
      });

      return {
        type: "header",
        key: `$${title}-folder`,
        name: title,
        items: tree,
        count: items.length,
        onAdd: () => actions.onAddArena(arenaSection),
      };
    };
    const recentArenas = studioCtx.recentArenas;
    const recentRows: ArenaPanelRow[] =
      recentArenas.length >= 2
        ? [
            {
              type: "any",
              element: "Recent",
              key: "$recent-tab",
            },
            ...withoutNils(
              recentArenas
                .map((arena) => {
                  if (arena === studioCtx.currentArena) {
                    return undefined;
                  }
                  return mapToArenaData(arena, {
                    keyPrefix: `$recent-`,
                    isStandalone: true,
                  });
                })
                .reverse(),
            ),
          ]
        : [];
    const items: ArenaPanelRow[] = withoutNils([
      ...recentRows,
      getSection(
        <LabelWithDetailedTooltip tooltip={ARENAS_DESCRIPTION}>
          Arenas
        </LabelWithDetailedTooltip>,
        "custom",
        studioCtx.getSortedMixedArenas(),
      ),
      getSection("Pages", "page", studioCtx.getSortedPageArenas()),
      getSection(
        "Components",
        "component",
        studioCtx.getSortedComponentArenas(),
      ),
    ]);
    return items;
  },
);

function ArenaTreeRow(props: RenderElementProps<ArenaPanelRow>) {
  const { value, treeState } = props;
  switch (value.type) {
    case "header":
      return (
        <NavigationHeaderRow
          onAdd={value.onAdd}
          groupSize={value.count}
          isOpen={treeState.isOpen}
          toggleExpand={treeState.toggleExpand}
        >
          {treeState.matcher.boldSnippets(value.name)}
        </NavigationHeaderRow>
      );
    case "folder-element":
      return (
        <NavigationFolderRow
          folder={value}
          matcher={treeState.matcher}
          isOpen={treeState.isOpen}
          indentMultiplier={treeState.level}
          toggleExpand={treeState.toggleExpand}
        />
      );
    case "custom":
    case "page":
    case "component":
      return (
        <NavigationArenaRow
          arena={value.arena}
          matcher={treeState.matcher}
          indentMultiplier={treeState.level}
          isStandalone={value.isStandalone}
          isSelected={treeState.isSelected}
          onClick={() => treeState.nodeAction?.(value)}
        />
      );
    case "any":
      return (
        <NavigationAnyRow element={value.element} matcher={treeState.matcher} />
      );
    default:
      unreachable(value);
  }
}
