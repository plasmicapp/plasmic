import { apiKey } from "@/wab/client/api";
import { SEARCH_PARAM_BRANCH, UU } from "@/wab/client/cli-routes";
import {
  KeyboardShortcut,
  menuSection,
} from "@/wab/client/components/menu-builder";
import promptDeleteComponent from "@/wab/client/components/modals/componentDeletionModal";
import {
  reactConfirm,
  reactPrompt,
  showTemporaryPrompt,
} from "@/wab/client/components/quick-modals";
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
import FolderItem from "@/wab/client/components/sidebar-tabs/ProjectPanel/FolderItem";
import styles from "@/wab/client/components/sidebar-tabs/ProjectPanel/ProjectPanelTop.module.scss";
import { Matcher } from "@/wab/client/components/view-common";
import { Spinner } from "@/wab/client/components/widgets";
import Button from "@/wab/client/components/widgets/Button";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { NewComponentInfo } from "@/wab/client/components/widgets/NewComponentModal";
import {
  providesAppCtx,
  useTopFrameApi,
} from "@/wab/client/contexts/AppContexts";
import { useVirtualCombobox } from "@/wab/client/hooks/useVirtualCombobox";
import {
  buildInsertableExtraInfo,
  getScreenVariantToInsertableTemplate,
  replaceWithPageTemplate,
} from "@/wab/client/insertable-templates";
import ComponentIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Component";
import MixedArenaIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__MixedArena";
import PageIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__Page";
import { DefaultFolderItemProps } from "@/wab/client/plasmic/project_panel/PlasmicFolderItem";
import PlasmicProjectPanel from "@/wab/client/plasmic/project_panel/PlasmicProjectPanel";
import PlasmicSearchInput from "@/wab/client/plasmic/project_panel/PlasmicSearchInput";
import {
  promptComponentTemplate,
  promptPageTemplate,
} from "@/wab/client/prompts";
import { getComboForAction } from "@/wab/client/shortcuts/studio/studio-shortcuts";
import {
  StudioCtx,
  calculateNextVersionKey,
  providesStudioCtx,
  useStudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { testIds } from "@/wab/client/test-helpers/test-ids";
import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import { valueAsString } from "@/wab/commons/values";
import {
  ApiBranch,
  BranchId,
  ListBranchesResponse,
  MainBranchId,
} from "@/wab/shared/ApiSchema";
import { validateBranchName } from "@/wab/shared/ApiSchemaUtil";
import {
  AnyArena,
  getArenaName,
  isComponentArena,
  isDedicatedArena,
  isMixedArena,
  isPageArena,
} from "@/wab/shared/Arenas";
import {
  ARENAS_CAP,
  ARENAS_DESCRIPTION,
  ARENA_LOWER,
} from "@/wab/shared/Labels";
import { tryGetMainContentSlotTarget } from "@/wab/shared/SlotUtils";
import { addEmptyQuery } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { componentsReferecerToPageHref } from "@/wab/shared/cached-selectors";
import { getHostLessComponents } from "@/wab/shared/code-components/code-components";
import { toVarName } from "@/wab/shared/codegen/util";
import {
  assert,
  ensure,
  maybe,
  spawn,
  spawnWrapper,
  swallow,
  withoutNils,
} from "@/wab/shared/common";
import {
  ComponentType,
  PageComponent,
  getSubComponents,
  getSuperComponents,
  isPageComponent,
  isReusableComponent,
} from "@/wab/shared/core/components";
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
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { tryEvalExpr } from "@/wab/shared/eval";
import { pathToString } from "@/wab/shared/eval/expression-parser";
import { InsertableTemplateComponentExtraInfo } from "@/wab/shared/insertable-templates/types";
import {
  Component,
  ComponentArena,
  ExprText,
  ObjectPath,
  PageArena,
  isKnownArena,
  isKnownComponentArena,
  isKnownPageArena,
} from "@/wab/shared/model/classes";
import { naturalSort } from "@/wab/shared/sort";
import { TableSchema } from "@plasmicapp/data-sources";
import { executePlasmicDataOp } from "@plasmicapp/react-web/lib/data-sources";
import { Dropdown, Menu, Tooltip, notification } from "antd";
import { UseComboboxGetItemPropsOptions } from "downshift";
import { trimStart } from "lodash";
import { observer } from "mobx-react";
import { computedFn } from "mobx-utils";
import React, { ReactNode, useRef, useState } from "react";
import { FocusScope } from "react-aria";
import { useDebounce } from "react-use";
import { FixedSizeList } from "react-window";
import useSWR, { mutate } from "swr";

const enum SiteItemType {
  arena = "arena",
  page = "page",
  component = "component",
  folder = "folder",
  branch = "branch",
}

type ProjectListData = {
  setRenamingItem: (item?: AnyArena) => void;
  setQuery: (query?: string) => void;
  renamingItem: AnyArena;
  currentArena: AnyArena;
  items: {
    uid: number;
    name: string;
    label: ReactNode;
    pathname?: string;
    item: AnyArena;
    itemIndex: number;
    nameWithQueryHighlighting: React.ReactNode;
    type?: DefaultFolderItemProps["type"];
  }[];
};

type VirtualItem =
  | ProjectListData["items"][number]
  | {
      name: string;
      label: string;
      item: never;
    };

export const typeFilters: {
  [key: string]: {
    label: React.ReactNode;
    outerLabel?: React.ReactNode;
    matches: (it: AnyArena) => boolean;
  };
} = {
  everything: {
    label: "Everything",
    outerLabel: "Project",
    matches: () => true,
  },
  arenas: {
    label: (
      <div className={styles.filterMenuItem}>
        <Icon icon={MixedArenaIcon} />
        {ARENAS_CAP}
      </div>
    ),

    matches: (it: AnyArena) => isKnownArena(it),
  },

  pages: {
    label: (
      <div className={styles.filterMenuItem}>
        <Icon icon={PageIcon} />
        Pages
      </div>
    ),

    matches: (it: AnyArena) =>
      isKnownPageArena(it) && isPageComponent(it.component),
  },

  components: {
    label: (
      <div className={styles.filterMenuItem}>
        <Icon icon={ComponentIcon} />
        Components
      </div>
    ),

    matches: (it: AnyArena) =>
      isKnownComponentArena(it) && !isPageComponent(it.component),
  },
};

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

interface ProjectPanelTopProps {
  onClose: () => void;
}

export const ProjectPanelTop = observer(React.forwardRef(ProjectPanelTop_));

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

function ProjectPanelTop_(
  { onClose }: ProjectPanelTopProps,
  outerRef: React.Ref<HTMLDivElement>
) {
  const studioCtx = useStudioCtx();
  const currentArena = studioCtx.currentArena!;
  const contentEditorMode = studioCtx.contentEditorMode;

  const searchInputRef = studioCtx.projectSearchInputRef;
  const listRef = useRef<FixedSizeList>(null);
  const [renamingItem, setRenamingItem] = useState<AnyArena | undefined>();

  const selectedItem = currentArena;

  const onRequestAdding =
    (itemType: "arena" | "page" | "component") => async () => {
      onClose();
      let componentInfo: NewComponentInfo | undefined;
      switch (itemType) {
        case "arena":
          await studioCtx.changeUnsafe(() => {
            const arena = studioCtx.addArena();
            setRenamingItem(arena);
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

          let info: InsertableTemplateComponentExtraInfo | undefined =
            undefined;
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
                  chosenTemplate.projectId,
                  chosenTemplate.componentName,
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
                      lookupFields.map((field, idx) => [
                        field,
                        `{{${idx + 1}}}`,
                      ])
                    ),
                    bindings: Object.fromEntries(
                      lookupFields.map((field, idx) => {
                        const path = new ObjectPath({
                          path: ["$ctx", "params", field],
                          fallback: null,
                        });
                        const fieldType =
                          tableSchema.fields.find((f) => f.id === field)
                            ?.type ?? "text";
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
                        (isTplContainer(page.tplTree)
                          ? page.tplTree
                          : undefined);

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

  const {
    highlightedVirtualItemIndex,
    getComboboxProps,
    getMenuProps,
    getItemProps,
    getInputProps,
    query,
    virtualItems,
    setQuery,
  } = useVirtualCombobox({
    listRef,
    buildItems: (q) => buildItems(studioCtx, q),
    selectedItem,
    onSelect: spawnWrapper(async (arena: AnyArena | undefined) => {
      onClose();
      if (arena) {
        await studioCtx.change(({ success }) => {
          studioCtx.switchToArena(arena);
          return success();
        });
      }
    }),
    itemToString: (item) => (item ? `${item.uid}` : ""),
    alwaysHighlight: true,
    debounceMs: 200,
  });

  const context = React.useMemo(
    () => ({
      items: virtualItems,
      renamingItem,
      setQuery,
      setRenamingItem,
      currentArena,
      selectedItem,
      highlightedVirtualItemIndex,
      onClose,
      getItemProps,
    }),
    [
      virtualItems,
      renamingItem,
      setQuery,
      setRenamingItem,
      currentArena,
      selectedItem,
      highlightedVirtualItemIndex,
      onClose,
      getItemProps,
    ]
  );

  return (
    <div className={styles.root} ref={outerRef} {...testIds.projectPanel}>
      <FocusScope contain>
        <PlasmicProjectPanel
          // We use pointerEvents:auto here because antd popover has a bug
          // where if it is open/closed quickly it may not remove the
          // `pointerEvents: none` it adds to the popover container
          style={{ zIndex: 0, pointerEvents: "auto" }}
          root={{
            ...getComboboxProps(),
          }}
          plusButton={{
            props: {
              id: "proj-panel-plus-btn",
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
                          <Menu.Item onClick={onRequestAdding("arena")}>
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
            wrap: () => (
              <PlasmicSearchInput
                withShortcut
                shortcut={{
                  wrap: () =>
                    query ? null : (
                      <KeyboardShortcut tooltip="Go to page/component">
                        {getComboForAction("SEARCH_PROJECT_ARENAS")}
                      </KeyboardShortcut>
                    ),
                }}
                overrides={{
                  searchInput: {
                    ...getInputProps({
                      ref: searchInputRef,
                      value: query,
                      onKeyUp: (e) => {
                        if (e.key === "Escape" && query.trim().length === 0) {
                          onClose();
                        }
                      },
                    }),
                    "data-test-id": "panel-top-search-input",
                  },
                  clearFieldIcon: {
                    style: { display: query ? "block" : "none" },
                    onClick: () => setQuery(""),
                  },
                }}
              />
            ),
          }}
        >
          <ul {...getMenuProps()}>
            <ProjectPanelContext.Provider value={context}>
              <FixedSizeList
                ref={listRef}
                itemCount={virtualItems.length}
                itemSize={32}
                width="100%"
                height={window.innerHeight * 0.6}
                overscanCount={2}
              >
                {Row}
              </FixedSizeList>
            </ProjectPanelContext.Provider>
          </ul>
        </PlasmicProjectPanel>
      </FocusScope>
    </div>
  );
}

const buildItems = computedFn((studioCtx: StudioCtx, query: string) => {
  const matcher = new Matcher(query, { matchMiddleOfWord: true });
  let cur = 0;
  const getSection = (
    title: string,
    type: SiteItemType,
    items: AnyArena[],
    label?: ReactNode
  ) => {
    const _items = items
      .map(addType(type))
      .filter((it) => {
        const queryMatches = matcher.matches(it.name);
        const queryMatchesPath = matcher.matches(
          (isKnownPageArena(it.item) &&
            it.item.component.pageMeta?.path) as string
        );
        const queryMatchesDescendant =
          isKnownComponentArena(it.item) &&
          getSubComponents(it.item.component).some((comp) =>
            matcher.matches(comp.name)
          );
        return queryMatchesPath || queryMatches || queryMatchesDescendant;
      })
      .map((it) => ({
        ...it,
        itemIndex: cur++,
        nameWithQueryHighlighting: matcher.boldSnippets(it.name),
        pathname: isKnownPageArena(it.item)
          ? matcher.boldSnippets(it.item.component.pageMeta?.path)
          : undefined,
      }));
    return [
      ...(_items.length
        ? [{ name: title, label: label ?? title, item: undefined }]
        : []),
      ..._items,
    ] as VirtualItem[];
  };
  const virtualItems = [
    ...getSection(
      ARENAS_CAP,
      SiteItemType.arena,
      getSortedMixedArenas(studioCtx),
      <LabelWithDetailedTooltip tooltip={ARENAS_DESCRIPTION}>
        {ARENAS_CAP}
      </LabelWithDetailedTooltip>
    ),
    ...getSection("Pages", SiteItemType.page, getSortedPageArenas(studioCtx)),
    ...getSection(
      "Components",
      SiteItemType.component,
      getSortedComponentArenas(studioCtx)
    ),
  ];
  const items = virtualItems.filter((vi) => !!vi.item).map((vi) => vi.item!);
  return {
    virtualItems,
    items,
  };
});
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

function getFolderItemMenuRenderer({
  folderItem,
  currentArena,
  setRenamingItem,
  studioCtx,
  onClose,
}: {
  folderItem: {
    uid: number;
    name: any;
    item: AnyArena;
    nameWithQueryHighlighting: React.ReactNode;
    type?: DefaultFolderItemProps["type"];
  };
  onClose: () => void;
  currentArena: AnyArena;
  setRenamingItem: (s: AnyArena) => void;
  studioCtx: StudioCtx;
}) {
  return () => {
    const component = isDedicatedArena(folderItem.item)
      ? folderItem.item.component
      : undefined;

    const isSubComp = !!component && !!component.superComp;
    const isSuperComp = !!component && component.subComps.length > 0;
    const isAdmin = isAdminTeamEmail(
      studioCtx.appCtx.selfInfo?.email,
      studioCtx.appCtx.appConfig
    );

    const doReplaceAllInstances = (toComp: Component) => {
      spawn(studioCtx.siteOps().swapComponents(component!, toComp));
    };

    const componentToReplaceAllInstancesItem = (comp: Component) => {
      return (
        <Menu.Item
          key={comp.uuid}
          hidden={!isReusableComponent(comp) || comp === component}
          onClick={() => doReplaceAllInstances(comp)}
        >
          {comp.name}
        </Menu.Item>
      );
    };

    const replaceAllInstancesMenuItems = [
      ...menuSection(
        "local",
        ...naturalSort(studioCtx.site.components, (c) => c.name).map((comp) =>
          componentToReplaceAllInstancesItem(comp)
        )
      ),
      ...studioCtx.site.projectDependencies.flatMap((dep) =>
        menuSection(
          "imported",
          ...naturalSort(dep.site.components, (c) => c.name).map((comp) =>
            componentToReplaceAllInstancesItem(comp)
          )
        )
      ),
    ];

    const contentEditorMode = studioCtx.contentEditorMode;

    const shouldShowItem = {
      duplicate:
        isDedicatedArena(folderItem.item) &&
        !isSubComp &&
        (!contentEditorMode || (component && isPageComponent(component))),
      editInNewArtboard:
        isMixedArena(currentArena) &&
        isDedicatedArena(folderItem.item) &&
        !contentEditorMode,
      convertToComponent:
        component && isPageComponent(component) && !contentEditorMode,
      convertToPage:
        component &&
        isReusableComponent(component) &&
        !isSubComp &&
        !isSuperComp &&
        !contentEditorMode,
      delete:
        !isSubComp &&
        (!contentEditorMode || (component && isPageComponent(component))),
      findReferences: component && isReusableComponent(component),
      replaceAllInstances:
        component &&
        isReusableComponent(component) &&
        replaceAllInstancesMenuItems.length !== 0 &&
        !contentEditorMode,
    };

    const onDuplicate = () =>
      studioCtx.siteOps().tryDuplicatingComponent(component!, {
        focusNewComponent: true,
      });

    const onRename = () => setRenamingItem(folderItem.item);

    const onRequestEditingInNewArtboard = () =>
      studioCtx.changeUnsafe(() =>
        studioCtx.siteOps().createNewFrameForMixedArena(component!)
      );

    const onConvertToComponent = () => {
      assert(
        component && isPageComponent(component),
        "Can only convert Page to component if it exists"
      );
      return studioCtx.siteOps().convertPageToComponent(component);
    };

    const onConvertToPage = () =>
      studioCtx.changeObserved(
        () => [component!],
        ({ success }) => {
          studioCtx.siteOps().convertComponentToPage(component!);
          return success();
        }
      );

    const onFindReferences = () =>
      studioCtx.changeUnsafe(
        () => (studioCtx.findReferencesComponent = component)
      );

    const onDelete = async () => {
      const confirmation = await promptDeleteComponent(
        getSiteItemTypeName(folderItem.item),
        folderItem.name
      );
      if (!confirmation) {
        return;
      }
      await studioCtx.changeObserved(
        () => {
          return isDedicatedArena(folderItem.item) &&
            isPageComponent(folderItem.item.component)
            ? Array.from(
                componentsReferecerToPageHref(
                  studioCtx.site,
                  folderItem.item.component
                )
              )
            : [];
        },
        ({ success }) => {
          if (isDedicatedArena(folderItem.item)) {
            studioCtx.siteOps().tryRemoveComponent(folderItem.item.component);
          } else if (isMixedArena(folderItem.item)) {
            studioCtx.siteOps().removeMixedArena(folderItem.item);
          }
          return success();
        }
      );
    };

    return (
      <Menu
        onClick={(e) => {
          e.domEvent.stopPropagation();
          // Auto-close the popover except for these actions
          if (
            ![
              "rename",
              "duplicate",
              "convertToComponent",
              "convertToPage",
            ].includes(e.key)
          ) {
            onClose();
          }
        }}
        id="proj-item-menu"
      >
        {menuSection(
          "references",
          <Menu.Item
            key="references"
            hidden={!shouldShowItem.findReferences}
            onClick={onFindReferences}
          >
            <strong>Find</strong> all references
          </Menu.Item>
        )}
        {menuSection(
          "component-actions",
          <Menu.Item
            key="rename"
            onClick={(e) => {
              e.domEvent.stopPropagation();
              onRename();
            }}
          >
            <strong>Rename</strong> {getSiteItemTypeName(folderItem.item)}
          </Menu.Item>,
          <Menu.Item
            key="duplicate"
            hidden={!shouldShowItem.duplicate}
            onClick={onDuplicate}
          >
            <strong>Duplicate</strong> {getSiteItemTypeName(folderItem.item)}
          </Menu.Item>
        )}
        {menuSection(
          "artboard-actions",
          <Menu.Item
            key="editInNewArtboard"
            hidden={!shouldShowItem.editInNewArtboard}
            onClick={onRequestEditingInNewArtboard}
          >
            <strong>Edit</strong> in new artboard
          </Menu.Item>,
          <Menu.Item
            key="convertToComponent"
            hidden={!shouldShowItem.convertToComponent}
            onClick={onConvertToComponent}
          >
            <strong>Convert</strong> to reusable component
          </Menu.Item>,
          <Menu.Item
            key="convertToPage"
            hidden={!shouldShowItem.convertToPage}
            onClick={onConvertToPage}
          >
            <strong>Convert</strong> to page component
          </Menu.Item>
        )}
        {shouldShowItem.replaceAllInstances &&
          menuSection(
            "replace",
            <Menu.SubMenu
              key="replaceAllInstances"
              title={
                <span>
                  <strong>Replace</strong> all instances of this component
                  with...
                </span>
              }
            >
              {replaceAllInstancesMenuItems}
            </Menu.SubMenu>
          )}
        {menuSection(
          "delete",
          <Menu.Item
            key="delete"
            onClick={onDelete}
            hidden={!shouldShowItem.delete}
          >
            <strong>Delete</strong> {getSiteItemTypeName(folderItem.item)}
          </Menu.Item>
        )}
        {isAdmin &&
          menuSection(
            "debug",
            <Menu.SubMenu key="debug" title={"Debug"}>
              {component && (
                <Menu.SubMenu
                  key="site-splitting"
                  title="Site-splitting utilities"
                >
                  {isPageComponent(component) && (
                    <Menu.Item
                      key="delete-preserve-links"
                      onClick={async () =>
                        studioCtx.changeObserved(
                          () => [
                            component,
                            ...componentsReferecerToPageHref(
                              studioCtx.site,
                              component
                            ),
                          ],
                          ({ success }) => {
                            studioCtx
                              .tplMgr()
                              .removeComponentGroup([component], {
                                convertPageHrefToCode: true,
                              });
                            return success();
                          }
                        )
                      }
                    >
                      <strong>Delete</strong> page, but convert PageHref to
                      links
                    </Menu.Item>
                  )}
                </Menu.SubMenu>
              )}
            </Menu.SubMenu>
          )}
      </Menu>
    );
  };
}

function addType(type: SiteItemType) {
  return (it: AnyArena) => ({
    uid: it.uid,
    name: getArenaName(it),
    type: type as DefaultFolderItemProps["type"],
    item: it,
  });
}

function mkMatcher(q: string = "") {
  return new Matcher(q, { matchMiddleOfWord: true });
}

function getSiteItemTypeName(item: AnyArena) {
  if (isMixedArena(item)) {
    return "arena";
  } else if (isComponentArena(item)) {
    return "component";
  } else if (isPageArena(item)) {
    return "page";
  } else {
    return "folder";
  }
}

export const BranchPanelTop = observer(React.forwardRef(BranchPanelTop_));

function BranchPanelTop_(
  { onClose }: ProjectPanelTopProps,
  outerRef: React.Ref<HTMLDivElement>
) {
  const topFrameApi = useTopFrameApi();
  const studioCtx = useStudioCtx();
  const projectId = studioCtx.siteInfo.id;
  const api = studioCtx.appCtx.api;
  const { data: branchesResponse } = useSWR<ListBranchesResponse>(
    apiKey(`listBranchesForProject`, projectId),
    () => api.listBranchesForProject(projectId),
    { revalidateOnMount: true, focusThrottleInterval: 0, dedupingInterval: 0 }
  );

  const { data: unpublishedChangesResponse } = useSWR(
    calculateNextVersionKey(studioCtx),
    async () => ({
      mainHasUnpublishedChanges: await studioCtx.branchHasUnpublishedChanges({
        branchId: null,
      }),
    }),
    { revalidateOnMount: true, focusThrottleInterval: 0, dedupingInterval: 0 }
  );

  const searchInputRef = studioCtx.projectSearchInputRef;
  const [queryMatcher, setQueryMatcher] = useState(mkMatcher());
  const [query, setQuery] = useState("");
  const listRef = useRef<FixedSizeList>(null);
  const [renamingItem, setRenamingItem] = useState<
    ApiBranch | MainBranchId | undefined
  >();
  const [fetchingData, setFetchingData] = useState(false);

  useDebounce(() => setQueryMatcher(mkMatcher(query)), 200, [query]);

  if (!branchesResponse || !unpublishedChangesResponse || fetchingData) {
    return (
      <div className={styles.root} ref={outerRef} {...testIds.projectPanel}>
        <Spinner />
      </div>
    );
  }

  // The `undefined` branch is the main branch, in both items and activeBranch (which are compared later).

  const allBranches = branchesResponse.branches;
  const focusedBranch = allBranches.find(
    (branch) => branch.id === studioCtx.dbCtx().branchInfo?.id
  );
  const activeBranches = allBranches.filter(
    (branch) => branch.status === "active"
  );
  const archivedBranches = allBranches.filter(
    (branch) => branch.status === "abandoned" || branch.status === "merged"
  );

  function queryBranches(branches: (ApiBranch | undefined)[]) {
    return branches
      .filter((branch) => queryMatcher.matches(branch?.name ?? "main"))
      .map((branch) => ({
        type: "branch",
        branch,
        nameWithQueryHighlighting: queryMatcher.boldSnippets(
          branch?.name ?? "main"
        ),
      }));
  }

  const shownActiveBranches = queryBranches([undefined, ...activeBranches]);
  const shownArchivedBranches = queryBranches(archivedBranches);
  const items = withoutNils([
    shownActiveBranches.length > 0 && { label: "Active Branches" },
    ...shownActiveBranches,
    shownArchivedBranches.length > 0 && { label: "Archived Branches" },
    ...shownArchivedBranches,
  ]);

  const dismissSearch = () => {
    setQuery("");
  };

  async function promptBranchName(defaultValue: string) {
    const name = await reactPrompt({
      message: "Name for branch",
      placeholder: "feat/branchname",
      defaultValue,
      rules: [
        {
          async validator(_, value) {
            const msg = validateBranchName(
              value,
              allBranches.filter((b) => b.name !== defaultValue)
            );
            if (msg) {
              throw new Error(msg);
            }
          },
        },
      ],
    });
    return name;
  }

  function refresh() {
    return mutate(apiKey("listBranchesForProject", projectId));
  }

  async function onRename(branch: ApiBranch) {
    const name = await promptBranchName(branch.name);
    if (!name) {
      return;
    }
    await api.updateBranch(projectId, branch.id, { name });
    await refresh();
    // Refresh the branch and repalce the URL if we're renaming the currently focused branch
    if (focusedBranch?.id === branch.id) {
      const branches = await api.listBranchesForProject(projectId);
      const updatedBranch = branches.branches.find((b) => b.id === branch.id);
      studioCtx.switchToBranch(updatedBranch, undefined, { replace: true });
    }
  }

  async function checkMainCommitted() {
    const hasCommits = studioCtx.releases.length > 0;
    if (!hasCommits || unpublishedChangesResponse?.mainHasUnpublishedChanges) {
      if (
        await reactConfirm({
          title: "Publish the main branch",
          message:
            "Branches must start from a published version, and the main branch has unpublished changes. Publish a version first in order to start the branch from the most recent changes.",
          confirmLabel: "Publish a version first",
          cancelLabel: hasCommits ? "Use last published version" : "Cancel",
        })
      ) {
        await topFrameApi.setShowPublishModal(true);
        onClose();
        return false;
      }
      if (!hasCommits) {
        return false;
      }
    }
    assert(
      hasCommits,
      "Must have some commits at this point in creating a branch"
    );
    return true;
  }

  async function checkUnpublishedChanges(sourceBranchId: BranchId) {
    setFetchingData(true);
    const hasUnpublishedChanges = await studioCtx.branchHasUnpublishedChanges({
      branchId: sourceBranchId,
    });
    setFetchingData(false);
    if (hasUnpublishedChanges) {
      if (
        await reactConfirm({
          title: "Publish latest changes",
          message:
            "The branch you selected has some unpublished changes. Would you like to publish the latest changes before creating a new branch it?",
          confirmLabel: "Publish a version first",
          cancelLabel: "Use last published version",
        })
      ) {
        if (sourceBranchId !== studioCtx.branchInfo()?.id) {
          studioCtx.switchToBranch(
            ensure(
              allBranches.find((branch) => branch.id === sourceBranchId),
              () => `Couldn't find branch ${sourceBranchId}`
            )
          );
        }
        await topFrameApi.setShowPublishModal(true);
        onClose();
        return false;
      }
    }
    return true;
  }

  async function handleCreateBranch(sourceBranchId?: BranchId) {
    if (studioCtx.appCtx.appConfig.disableBranching) {
      return notification.error({
        message: "Branch creation in maintenance",
        duration: 0,
        description: (
          <>
            <p>
              We are debugging some issues with the branching functionality
              that's in early access, and out of an abundance of caution, we're
              disabling creation of new branches at the moment. We are taking
              the feature into maintenance to iron things out, and currently
              estimate it will take several weeks before we are comfortable
              re-enabling the functionality.
            </p>
            <p>
              If necessary, you can continue accessing and merging the branches
              you currently have open, but we generally recommend avoiding
              unnecessary merges if possible.
            </p>
            <p>
              Sorry for the inconvenience - we know branching is an important
              part of the workflow, and we wouldn't disrupt things unless we
              felt it was needed to guarantee reliability. We're working on it.
              Thank you for bearing with us!
            </p>
          </>
        ),
      });
    }

    // If we're cloning the main branch but the main branch was never committed....
    if (!sourceBranchId && !(await checkMainCommitted())) {
      return undefined;
    }

    if (sourceBranchId && !(await checkUnpublishedChanges(sourceBranchId))) {
      return undefined;
    }

    const name = await promptBranchName("");
    if (!name) {
      return undefined;
    }
    const { branch: newBranch } = await api.createBranch(projectId, {
      name,
      sourceBranchId: sourceBranchId,
    });
    await refresh();
    await studioCtx.switchToBranch(newBranch);
    return newBranch;
  }

  return (
    <div className={styles.root} ref={outerRef} {...testIds.projectPanel}>
      <PlasmicProjectPanel
        style={{ zIndex: 0 }}
        plusButton={{
          props: {
            tooltip: "Create new branch",
            onClick: async () => {
              await handleCreateBranch();
            },
          },
        }}
        searchInput={{
          wrap: () => (
            <PlasmicSearchInput
              overrides={{
                searchInput: {
                  autoFocus: true,
                  ref: searchInputRef,
                  value: query,
                  onChange: (e) => setQuery(e.target.value),
                  onKeyUp: (e) => {
                    if (e.key === "Escape") {
                      if (query.trim().length === 0) {
                        onClose();
                      } else {
                        dismissSearch();
                      }
                    }
                  },
                },

                clearFieldIcon: {
                  style: { display: query ? "block" : "none" },
                  onClick: () => dismissSearch(),
                },
              }}
            />
          ),
        }}
      >
        <FixedSizeList
          ref={listRef}
          itemData={{
            items,
            renamingItem,
            setQuery,
            setRenamingItem,
            focusedBranch,
          }}
          itemCount={items.length}
          itemSize={32}
          width="100%"
          height={window.innerHeight * 0.4}
          overscanCount={2}
        >
          {({
            data: {
              items: _items,
              renamingItem: _renamingItem,
              setRenamingItem: _setRenamingItem,
              focusedBranch: _focusedBranch,
              setQuery: _setQuery,
            },
            index,
            style,
          }) => {
            const currentItem = _items[index] as {
              label?: ReactNode;
              branch?: ApiBranch;
              nameWithQueryHighlighting: ReactNode;
              type?: DefaultFolderItemProps["type"];
            };

            if (!currentItem.type) {
              return (
                <div className={styles.sectionHeader} style={style}>
                  {currentItem.label}
                </div>
              );
            }

            const branch = currentItem.branch;
            const onSwitch = async () => {
              dismissSearch();
              if (
                studioCtx.isLiveMode &&
                UU.projectPreview.parse(
                  studioCtx.appCtx.history.location.pathname
                )
              ) {
                // Avoid navigating back to dev mode
                const hashParams = new URLSearchParams(
                  trimStart(studioCtx.appCtx.history.location.hash, "#")
                );
                hashParams.set(
                  SEARCH_PARAM_BRANCH,
                  branch?.name || MainBranchId
                );
                studioCtx.appCtx.history.push({
                  hash: `#${hashParams.toString()}`,
                });
              } else {
                studioCtx.switchToBranch(branch);
              }
              onClose();
            };

            return (
              <FolderItem
                style={style}
                type={currentItem.type}
                isSelected={branch === _focusedBranch}
                cleanName={branch?.name ?? "main"}
                name={currentItem.nameWithQueryHighlighting}
                renaming={_renamingItem === (branch ?? MainBranchId)}
                menu={getBranchMenuRenderer({
                  branch: branch,
                  onRename: async () => {
                    assert(branch, "Should not be able to rename main branch");
                    await onRename(branch);
                  },
                  onSwitch,
                  onDuplicate: async () => {
                    if (await handleCreateBranch(branch?.id)) {
                      dismissSearch();
                    }
                  },
                  studioCtx,
                  onClose,
                  onToggleProtectionMainBranch: async () => {
                    await api.setMainBranchProtection(
                      projectId,
                      !studioCtx.siteInfo.isMainBranchProtected
                    );
                    await studioCtx.refreshSiteInfo();
                    notification.success({
                      message: `Main branch is now ${
                        studioCtx.siteInfo.isMainBranchProtected
                          ? "protected"
                          : "unprotected"
                      }`,
                    });
                    studioCtx.handleBranchProtectionAlert();
                  },
                })}
                renamingDisabled
                onRename={spawnWrapper(async (newName) => {
                  assert(branch, "Renaming should be disabled for main branch");
                  _setRenamingItem(undefined);
                  await api.updateBranch(projectId, branch.id, {
                    name: newName,
                  });
                })}
                onClick={onSwitch}
                tooltipActions={
                  currentItem.type === "page" ? "Page settings" : undefined
                }
              />
            );
          }}
        </FixedSizeList>
      </PlasmicProjectPanel>
    </div>
  );
}

function getBranchMenuRenderer({
  branch: _branch,
  studioCtx,
  onRename,
  onSwitch,
  onDuplicate,
  onToggleProtectionMainBranch,
}: {
  branch: ApiBranch | undefined;
  onClose: () => void;
  onRename: () => Promise<void>;
  onSwitch: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  onToggleProtectionMainBranch: () => Promise<void>;
  studioCtx: StudioCtx;
}) {
  return () => {
    const branch = _branch;
    const projectId = studioCtx.siteInfo.id;
    const isMainBranchProtected = studioCtx.siteInfo.isMainBranchProtected;
    const api = studioCtx.appCtx.api;

    function refresh() {
      return mutate(apiKey("listBranchesForProject", projectId));
    }

    return (
      <Menu
        onClick={(e) => {
          e.domEvent.stopPropagation();
        }}
        id="proj-item-menu"
      >
        {menuSection(
          "branch-protect",
          !branch && (
            <Menu.Item
              key="protect"
              onClick={async () => {
                await onToggleProtectionMainBranch();
              }}
            >
              <Tooltip title="When the main branch is in a protected state it's not possible to do direct changes to it.">
                <strong>
                  {isMainBranchProtected ? "Unprotect" : "Protect"}
                </strong>{" "}
                main branch
              </Tooltip>
            </Menu.Item>
          )
        )}
        {menuSection(
          "branch-switch",
          <Menu.Item key="switch" onClick={onSwitch}>
            <strong>Switch</strong> to branch
          </Menu.Item>
        )}
        {menuSection(
          "branch-name",
          branch && (
            <Menu.Item
              key="rename"
              onClick={async (e) => {
                e.domEvent.stopPropagation();
                await onRename();
              }}
            >
              <strong>Rename</strong> branch
            </Menu.Item>
          ),
          <Menu.Item key="duplicate" onClick={onDuplicate}>
            <strong>Duplicate</strong> branch
          </Menu.Item>
        )}
        {branch &&
          menuSection(
            "branch-state",
            <Menu.Item
              key="archive"
              onClick={async () => {
                await api.updateBranch(projectId, branch.id, {
                  status: branch.status === "active" ? "abandoned" : "active",
                });
                await refresh();
              }}
            >
              <strong>
                {branch.status === "active" ? "Archive" : "Unarchive"}
              </strong>{" "}
              branch
            </Menu.Item>,
            <Menu.Item
              key="delete"
              onClick={async () => {
                if (
                  await reactConfirm({
                    title: "Are you sure you want to delete this branch?",
                    message: "This cannot be undone.",
                    confirmLabel: "Delete branch",
                  })
                ) {
                  if (studioCtx.dbCtx().branchInfo?.id === branch.id) {
                    // Switch to main branch if this was the focused branch
                    await studioCtx.switchToBranch(undefined);
                  }
                  await api.deleteBranch(projectId, branch.id);
                  await refresh();
                }
              }}
            >
              <strong>Delete</strong> branch
            </Menu.Item>
          )}
      </Menu>
    );
  };
}

interface ProjectPanelContextValue {
  items: VirtualItem[];
  renamingItem: AnyArena | undefined;
  setQuery: (val: string) => void;
  setRenamingItem: (item: AnyArena | undefined) => void;
  currentArena: AnyArena;
  selectedItem: AnyArena | undefined;
  highlightedVirtualItemIndex: number | undefined;
  onClose: () => void;
  getItemProps: (options: UseComboboxGetItemPropsOptions<AnyArena>) => any;
}
const ProjectPanelContext = React.createContext<
  ProjectPanelContextValue | undefined
>(undefined);

const Row = observer(function Row(props: {
  index: number;
  style: React.CSSProperties;
}) {
  const { index, style } = props;
  const studioCtx = useStudioCtx();
  const context = ensure(
    React.useContext(ProjectPanelContext),
    `can only be used in ProjectPanel`
  );
  const {
    currentArena,
    selectedItem,
    highlightedVirtualItemIndex,
    items,
    renamingItem,
    setRenamingItem,
    onClose,
    getItemProps,
  } = context;
  const folderItem = items[index] as VirtualItem;

  if (!("type" in folderItem)) {
    return (
      <li className={styles.sectionHeader} style={style} key={folderItem.name}>
        {folderItem.label}
      </li>
    );
  }

  return (
    <FolderItem
      key={folderItem.item.uid}
      style={style}
      type={folderItem.type}
      isSelected={folderItem.item === selectedItem}
      isHighlighted={highlightedVirtualItemIndex === index}
      cleanName={folderItem.name}
      pathname={folderItem.pathname}
      name={folderItem.nameWithQueryHighlighting}
      renaming={renamingItem === folderItem.item}
      menu={getFolderItemMenuRenderer({
        folderItem: folderItem,
        currentArena: currentArena,
        setRenamingItem: setRenamingItem,
        studioCtx: studioCtx,
        onClose,
      })}
      onRename={(newName) => {
        setRenamingItem(undefined);
        maybe(
          studioCtx
            .siteOps()
            .tryRenameArena(folderItem.item as AnyArena, newName),
          (p) => spawn(p)
        );
      }}
      onClickActions={
        folderItem.type === "page"
          ? spawnWrapper(async () => {
              await studioCtx.changeUnsafe(
                () =>
                  (studioCtx.showPageSettings = (folderItem.item as PageArena)
                    .component as PageComponent)
              );
              onClose();
            })
          : undefined
      }
      tooltipActions={folderItem.type === "page" ? "Page settings" : undefined}
      indent={
        isKnownComponentArena(folderItem.item)
          ? getSuperComponents(folderItem.item.component).length
          : 0
      }
      {...getItemProps({
        item: folderItem.item,
        index: folderItem.itemIndex,
      })}
    />
  );
});
