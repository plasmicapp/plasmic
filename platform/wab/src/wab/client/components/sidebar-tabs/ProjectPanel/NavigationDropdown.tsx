import {
  RenderElementProps,
  VirtualTree,
  VirtualTreeRef,
} from "@/wab/client/components/grouping/VirtualTree";
import { KeyboardShortcut } from "@/wab/client/components/menu-builder";
import { showTemporaryPrompt } from "@/wab/client/components/quick-modals";
import {
  getOpIdForDataSourceOpExpr,
  orderFieldsByRanking,
  useSource,
  useSourceSchemaData,
} from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceOpPicker";
import {
  DataSourceTablePicker,
  INVALID_DATA_SOURCE_MESSAGE,
} from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceTablePicker";
import {
  HEADER_HEIGHT,
  NavigationAnyRow,
  NavigationArenaRow,
  NavigationFolderRow,
  NavigationHeaderRow,
  PAGE_HEIGHT,
  ROW_HEIGHT,
} from "@/wab/client/components/sidebar-tabs/ProjectPanel/NavigationRows";
import styles from "@/wab/client/components/sidebar-tabs/ProjectPanel/ProjectPanelTop.module.scss";
import Button from "@/wab/client/components/widgets/Button";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import { ListStack } from "@/wab/client/components/widgets/ListStack";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { NewComponentInfo } from "@/wab/client/components/widgets/NewComponentModal";
import { providesAppCtx } from "@/wab/client/contexts/AppContexts";
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
import {
  StudioCtx,
  providesStudioCtx,
  useStudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { testIds } from "@/wab/client/test-helpers/test-ids";
import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import { valueAsString } from "@/wab/commons/values";
import { ArenaType } from "@/wab/shared/ApiSchema";
import { AnyArena, getArenaName } from "@/wab/shared/Arenas";
import { ARENAS_DESCRIPTION, ARENA_LOWER } from "@/wab/shared/Labels";
import { tryGetMainContentSlotTarget } from "@/wab/shared/SlotUtils";
import { addEmptyQuery } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { getHostLessComponents } from "@/wab/shared/code-components/code-components";
import { toVarName } from "@/wab/shared/codegen/util";
import {
  assert,
  swallow,
  switchType,
  unreachable,
  withoutNils,
} from "@/wab/shared/common";
import { ComponentType, PageComponent } from "@/wab/shared/core/components";
import {
  asCode,
  code,
  codeLit,
  mkTemplatedStringOfOneDynExpr,
} from "@/wab/shared/core/exprs";
import {
  flattenTpls,
  isTplContainer,
  isTplTag,
  isTplTextBlock,
  mkTplComponentX,
  mkTplInlinedText,
} from "@/wab/shared/core/tpls";
import { getDataSourceMeta } from "@/wab/shared/data-sources-meta/data-source-registry";
import {
  LookupSpec,
  LookupSpecDraft,
  ensureDataSourceStandardQuery,
  ensureLookupSpecFromDraft,
} from "@/wab/shared/data-sources-meta/data-sources";
import { tryEvalExpr } from "@/wab/shared/eval";
import { pathToString } from "@/wab/shared/eval/expression-parser";
import {
  Folder as InternalFolder,
  createFolderTreeStructure,
  getFolderTrimmed,
  isFolder,
} from "@/wab/shared/folders/folders-util";
import { InsertableTemplateComponentExtraInfo } from "@/wab/shared/insertable-templates/types";
import {
  Arena,
  ComponentArena,
  ExprText,
  ObjectPath,
  PageArena,
} from "@/wab/shared/model/classes";
import { naturalSort } from "@/wab/shared/sort";
import { TableSchema } from "@plasmicapp/data-sources";
import { executePlasmicDataOp } from "@plasmicapp/react-web/lib/data-sources";
import { Dropdown, Menu } from "antd";
import { debounce } from "lodash";
import { observer } from "mobx-react";
import { computedFn } from "mobx-utils";
import React, { useRef } from "react";
import { FocusScope } from "react-aria";

interface Header {
  type: "header";
  name: React.ReactNode;
  key: string;
  items: ArenaPanelRow[];
  count: number;
  onAdd: () => Promise<void>;
}

interface FolderElement {
  type: "folder-element";
  name: string;
  key: string;
  items: ArenaPanelRow[];
  count: number;
}

interface PageArenaData {
  type: "page";
  key: string;
  arena: PageArena;
  isStandalone?: boolean;
}

interface CustomArenaData {
  type: "custom";
  key: string;
  arena: Arena;
  isStandalone?: boolean;
}

interface ComponentArenaData {
  type: "component";
  key: string;
  arena: ComponentArena;
  isStandalone?: boolean;
}

interface AnyData {
  type: "any";
  key: string;
  element: React.ReactNode;
}

type ArenaData = ComponentArenaData | CustomArenaData | PageArenaData;

type ArenaPanelRow = Header | FolderElement | ArenaData | AnyData;

function mapToArenaData(
  arena: AnyArena,
  opts: { keyPrefix: string; isStandalone?: boolean } = {
    keyPrefix: "",
    isStandalone: undefined,
  }
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

export function mapToArenaPanelRow(
  item: AnyArena | InternalFolder<AnyArena>
): ArenaPanelRow {
  if (!isFolder(item)) {
    return mapToArenaData(item);
  }

  return {
    type: "folder-element" as const,
    key: item.path,
    name: item.name,
    items: item.items.map((i) => mapToArenaPanelRow(i)),
    count: item.count,
  };
}

const DYNAMIC_PAGES_HELP_TEXT = `Generate a unique page per record from a table, with paths like \`/products/[id]\` and \`/posts/[id]\`. [Learn more in the docs](https://docs.plasmic.app/learn/dynamic-pages).`;

function DataSourceTablePickerWrapper({
  onSubmit,
  studioCtx,
}: {
  studioCtx: StudioCtx;
  onSubmit: ([lookupSpec, fields]: [LookupSpec, TableSchema]) => void;
}) {
  const [draft, setDraft] = React.useState<LookupSpecDraft | undefined>(
    undefined
  );
  const { data: source } = useSource(studioCtx, draft?.sourceId);
  const { data: sourceSchemaData } = useSourceSchemaData(
    studioCtx,
    draft?.sourceId,
    source
  );

  const isSaveDisabled = React.useMemo(
    () =>
      draft === undefined ||
      draft.sourceId === undefined ||
      draft.tableId === undefined ||
      draft.lookupFields === undefined,
    [draft]
  );

  const onCreatePage = React.useCallback(() => {
    if (!draft || !sourceSchemaData) {
      return;
    }
    const table = sourceSchemaData.tables.find(
      (t) => t.id === draft.tableId
    ) as TableSchema;
    if (!table) {
      return;
    }
    onSubmit([ensureLookupSpecFromDraft(draft), table]);
  }, [source, sourceSchemaData, draft]);

  return (
    <div className="flex flex-col gap-xlg">
      <StandardMarkdown>{DYNAMIC_PAGES_HELP_TEXT}</StandardMarkdown>
      <DataSourceTablePicker
        studioCtx={studioCtx}
        draft={draft}
        onChange={(newDraft) => setDraft(newDraft)}
        requiredStandardQueries={["getList", "getOne"]}
        invalidDataSourceMessage={INVALID_DATA_SOURCE_MESSAGE.dynamicPages}
        exprCtx={{
          projectFlags: studioCtx.projectFlags(),
          component: null,
          inStudio: true,
        }}
      />
      <div>
        <Button
          type={"primary"}
          disabled={isSaveDisabled}
          onClick={onCreatePage}
        >
          Create dynamic page
        </Button>
      </div>
    </div>
  );
}

const rankedFieldsForDisplayName = [
  "displayname",
  "title",
  "name",
  "firstname",
  "username",
  "label",
  "description",
  "email",
  "handle",
  "slug",
  "id",
];

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
  React.forwardRef(NavigationDropdown_)
);

function NavigationDropdown_(
  { onClose }: NavigationDropdownProps,
  outerRef: React.Ref<HTMLDivElement>
) {
  const studioCtx = useStudioCtx();
  const contentEditorMode = studioCtx.contentEditorMode;

  const searchInputRef = studioCtx.projectSearchInputRef;
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const debouncedSetQuery = React.useCallback(
    debounce((value: string) => {
      setDebouncedQuery(value);
    }, 500),
    [setDebouncedQuery]
  );
  const treeRef = useRef<VirtualTreeRef>(null);

  const getRowKey = React.useCallback((row: ArenaPanelRow) => {
    return row.key;
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

  const onRequestAdding = (arenaType: ArenaType) => async () => {
    onClose();
    let componentInfo: NewComponentInfo | undefined;
    switch (arenaType) {
      case "custom":
        await studioCtx.changeUnsafe(() => {
          studioCtx.addArena();
        });
        break;

      case "component":
        componentInfo = await promptComponentTemplate(studioCtx);
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
        const chosenTemplate = await promptPageTemplate(studioCtx);
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
              ""
            );

            const { screenVariant } =
              await getScreenVariantToInsertableTemplate(studioCtx);
            info = await studioCtx.appCtx.app.withSpinner(
              buildInsertableExtraInfo(
                studioCtx,
                chosenTemplate as { projectId: string; componentName: string },
                screenVariant
              )
            );

            await mkPage();
            break;
          }
          case "dynamic": {
            // First, ask what to create a dynamic page over.
            const dynpageResponse = await showTemporaryPrompt<
              [LookupSpec, TableSchema]
            >((onSubmit, onCancel) =>
              providesStudioCtx(studioCtx)(
                providesAppCtx(studioCtx.appCtx)(
                  <Modal
                    title={`Create dynamic page template`}
                    visible={true}
                    footer={null}
                    onCancel={() => onCancel()}
                  >
                    <DataSourceTablePickerWrapper
                      studioCtx={studioCtx}
                      onSubmit={onSubmit}
                    />
                  </Modal>
                )
              )
            );
            if (!dynpageResponse) {
              return;
            }
            const [lookupSpec, tableSchema] = dynpageResponse;

            await studioCtx.app.withSpinner(
              (async () => {
                // *Now* create the page.
                const page = await mkPage();

                // Prep
                const { lookupFields, tableLabel, tableId, sourceType } =
                  lookupSpec;
                const tableSym = toVarName(tableLabel ?? tableId);
                const sourceMeta = getDataSourceMeta(sourceType);

                // Try getting an arbitrary object.
                // Issue a getMany query without filters. Could be slow!
                const listRecords = ensureDataSourceStandardQuery(
                  sourceMeta,
                  "getList"
                )(lookupSpec.sourceId, lookupSpec.tableId);
                const { api } = studioCtx.appCtx;
                listRecords.opId = await getOpIdForDataSourceOpExpr(
                  api,
                  listRecords,
                  {
                    projectFlags: studioCtx.projectFlags(),
                    component: page,
                    inStudio: true,
                  },
                  studioCtx.siteInfo.id
                );
                const maybeEvalResult =
                  swallow(() =>
                    tryEvalExpr(
                      asCode(listRecords, {
                        projectFlags: studioCtx.projectFlags(),
                        component: page,
                        inStudio: true,
                      }).code,
                      {}
                    )
                  ) ?? undefined;
                const result = maybeEvalResult
                  ? await executePlasmicDataOp(maybeEvalResult.val)
                  : undefined;
                const initialValues = Object.fromEntries(
                  lookupFields.map((field) => [
                    field,
                    result?.data[0]?.[field] ?? "value",
                  ])
                );

                // Create the lookup query that the dynamic page will use.
                // It references $ctx.params.FIELD
                const lookupValue = {
                  value: Object.fromEntries(
                    lookupFields.map((field, idx) => [field, `{{${idx + 1}}}`])
                  ),
                  bindings: Object.fromEntries(
                    lookupFields.map((field, idx) => {
                      const path = new ObjectPath({
                        path: ["$ctx", "params", field],
                        fallback: null,
                      });
                      const fieldType =
                        tableSchema.fields.find((f) => f.id === field)?.type ??
                        "text";
                      return [
                        `{{${idx + 1}}}`,
                        ["text", "string"].includes(fieldType)
                          ? mkTemplatedStringOfOneDynExpr(path)
                          : path,
                      ];
                    })
                  ),
                };
                const getOneQuery = ensureDataSourceStandardQuery(
                  sourceMeta,
                  "getOne"
                )(lookupSpec.sourceId, tableSchema, lookupValue);
                getOneQuery.opId = await getOpIdForDataSourceOpExpr(
                  studioCtx.appCtx.api,
                  getOneQuery,
                  {
                    projectFlags: studioCtx.projectFlags(),
                    component: page,
                    inStudio: true,
                  },
                  studioCtx.siteInfo.id
                );

                // Update the page path info with the path URL.
                // Fill in the initialValue we got as the default preview value for the param.
                // And add name h1.
                await studioCtx.changeUnsafe(() => {
                  studioCtx
                    .tplMgr()
                    .changePagePath(
                      page,
                      `/${encodeURIComponent(tableSym)}/${lookupFields
                        .map((field) => `[${field}]`)
                        .join("/")}`
                    );
                  // Make sure to convert these to strings, since query params are always strings (not numbers etc.).
                  for (const field of lookupFields) {
                    page.pageMeta.params[field] = valueAsString(
                      initialValues[field]
                    );
                  }

                  // Find first h1 or insert h1 into first page section within main slot or root.
                  function createH1() {
                    const baseVariant = page.variants[0];
                    const newTpl = mkTplInlinedText(
                      "Name",
                      [baseVariant],
                      "h1"
                    );

                    // If there is a main slot, must insert there, or else root (assuming it's a container).
                    const root =
                      tryGetMainContentSlotTarget(page.tplTree) ??
                      (isTplContainer(page.tplTree) ? page.tplTree : undefined);

                    // Find a page section or else insert into slot/root.
                    const targetParent =
                      flattenTpls(page.tplTree).find(
                        (tpl) => isTplTag(tpl) && tpl.tag === "section"
                      ) ?? root;
                    if (!targetParent) {
                      return undefined;
                    }

                    $$$(targetParent).prepend(newTpl);

                    // Try also adding a RichDetails component, if installed.
                    // We're only adding this if inserting a new title.
                    // We don't try this if we found some existing h1.
                    const richDetailsComponent = getHostLessComponents(
                      studioCtx.site
                    ).find((c) => c.name === "hostless-rich-details");
                    if (richDetailsComponent) {
                      $$$(newTpl).after(
                        mkTplComponentX({
                          component: richDetailsComponent,
                          baseVariant,
                          args: {
                            data: new ObjectPath({
                              path: ["$queries", "query", "data", 0],
                              fallback: codeLit(null),
                            }),
                          },
                        })
                      );
                    }
                    return newTpl;
                  }

                  // Add the title as well.
                  const tplTitle =
                    flattenTpls(page.tplTree).find((tpl) =>
                      isTplTextBlock(tpl, "h1")
                    ) ?? createH1();
                  if (tplTitle) {
                    // Set its dynamic value.
                    const bestField =
                      orderFieldsByRanking(
                        tableSchema.fields,
                        rankedFieldsForDisplayName,
                        true
                      )[0]?.id ?? lookupFields[0];
                    tplTitle.vsettings[0].text = new ExprText({
                      expr: code(
                        `(${pathToString([
                          "$queries.query.data[0]",
                          bestField,
                        ])})`,
                        codeLit("Page title")
                      ),
                      html: false,
                    });
                  }

                  // Now add the query we prepared earlier as well.
                  const pageQuery = addEmptyQuery(page, "query");
                  pageQuery.op = getOneQuery;
                });
              })()
            );
            break;
          }
        }
      }
    }
  };

  const items = buildItems(studioCtx, onRequestAdding);

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
              onClick: contentEditorMode ? onRequestAdding("page") : undefined,
            },
            wrap: contentEditorMode
              ? undefined
              : (plusButton) => (
                  <Dropdown
                    placement={"bottomRight"}
                    children={plusButton}
                    overlay={
                      <Menu>
                        <Menu.Item onClick={onRequestAdding("page")}>
                          New <strong>page</strong>
                        </Menu.Item>
                        {!contentEditorMode && (
                          <Menu.Item onClick={onRequestAdding("component")}>
                            New <strong>component</strong>
                          </Menu.Item>
                        )}
                        {!contentEditorMode && (
                          <Menu.Item onClick={onRequestAdding("custom")}>
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
                onKeyUp: (e) => {
                  if (
                    e.key === "Escape" &&
                    debouncedQuery.trim().length === 0
                  ) {
                    onClose();
                  }
                },
                "data-test-id": "nav-dropdown-search-input",
              },
            },
          }}
          expandButton={{
            onClick: treeRef.current?.expandAll,
            "data-test-id": "nav-dropdown-expand-all",
          }}
          collapseButton={{
            onClick: treeRef.current?.collapseAll,
          }}
        >
          <NavigationDropdownContext.Provider value={contextValue}>
            <ListStack>
              <div style={{ height: 500 }}>
                <VirtualTree
                  ref={treeRef}
                  rootNodes={items}
                  getNodeKey={getRowKey}
                  getNodeChildren={getRowChildren}
                  getNodeSearchText={getRowSearchText}
                  getNodeHeight={getRowHeight}
                  query={debouncedQuery}
                  renderElement={ArenaTreeRow}
                  defaultOpenKeys={"all"}
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
  (
    studioCtx: StudioCtx,
    onRequestAdding: (type: ArenaType) => () => Promise<void>
  ) => {
    const getSection = (
      title: React.ReactNode,
      arenaSection: ArenaType,
      items: AnyArena[]
    ): ArenaPanelRow => {
      const tree = createFolderTreeStructure(items, {
        pathPrefix: `${title}-`,
        getName: (item) => getFolderTrimmed(getArenaName(item)),
        mapper: (item) => mapToArenaPanelRow(item),
      });

      return {
        type: "header",
        key: `$${title}-folder`,
        name: title,
        items: tree,
        count: items.length,
        onAdd: onRequestAdding(arenaSection),
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
                .reverse()
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
        getSortedMixedArenas(studioCtx)
      ),
      getSection("Pages", "page", getSortedPageArenas(studioCtx)),
      getSection(
        "Components",
        "component",
        getSortedComponentArenas(studioCtx)
      ),
    ]);
    return items;
  }
);

const getSortedComponentArenas = computedFn(function getSortedComponentArenas(
  studioCtx: StudioCtx
) {
  const componentArenas: ComponentArena[] = [];
  const addComponentArena = (compArena: ComponentArena) => {
    componentArenas.push(compArena);
    for (const subComp of compArena.component.subComps) {
      const subArena = studioCtx.getDedicatedArena(subComp) as
        | ComponentArena
        | undefined;
      if (subArena) {
        addComponentArena(subArena);
      }
    }
  };
  for (const compArena of naturalSort(
    studioCtx.site.componentArenas,
    (it) => it.component.name
  )) {
    if (compArena.component.superComp) {
      // Sub-components are added when dealing with super components
      continue;
    }

    if (!studioCtx.canEditComponent(compArena.component)) {
      continue;
    }

    addComponentArena(compArena);
  }
  return componentArenas;
});

const getSortedPageArenas = computedFn(function getSortedPageArenas(
  studioCtx: StudioCtx
) {
  return naturalSort(
    studioCtx.site.pageArenas,
    (it) => it.component.name
  ).filter((arena) => studioCtx.canEditComponent(arena.component));
});

const getSortedMixedArenas = computedFn(function getSortedMixedArenas(
  studioCtx: StudioCtx
) {
  return studioCtx.contentEditorMode ? [] : studioCtx.site.arenas;
});

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
          groupSize={value.count}
          isOpen={treeState.isOpen}
          indentMultiplier={treeState.level}
        >
          {treeState.matcher.boldSnippets(value.name)}
        </NavigationFolderRow>
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
