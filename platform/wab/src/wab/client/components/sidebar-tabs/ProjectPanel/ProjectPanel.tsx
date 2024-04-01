import PageSettings from "@/PageSettings";
import {
  Arena,
  Component,
  ComponentArena,
  isKnownArena,
  isKnownComponentArena,
  isKnownPageArena,
  PageArena,
} from "@/wab/classes";
import {
  KeyboardShortcut,
  menuSection,
} from "@/wab/client/components/menu-builder";
import { FindReferencesModal } from "@/wab/client/components/sidebar/FindReferencesModal";
import { TopModal } from "@/wab/client/components/studio/TopModal";
import { Matcher } from "@/wab/client/components/view-common";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { LabelWithDetailedTooltip } from "@/wab/client/components/widgets/LabelWithDetailedTooltip";
import { NewComponentInfo } from "@/wab/client/components/widgets/NewComponentModal";
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
import ChevronRightsvgIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__ChevronRightsvg";
import {
  promptComponentTemplate,
  promptPageTemplate,
} from "@/wab/client/prompts";
import { getComboForAction } from "@/wab/client/shortcuts/studio/studio-shortcuts";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { testIds } from "@/wab/client/test-helpers/test-ids";
import { maybe, spawn, switchType } from "@/wab/common";
import { XDraggable } from "@/wab/commons/components/XDraggable";
import {
  ComponentType,
  getComponentDisplayName,
  getSubComponents,
  getSuperComponents,
  isPageComponent,
  isReusableComponent,
  PageComponent,
} from "@/wab/components";
import {
  AnyArena,
  getArenaName,
  isComponentArena,
  isDedicatedArena,
  isMixedArena,
  isPageArena,
} from "@/wab/shared/Arenas";
import { InsertableTemplateExtraInfo } from "@/wab/shared/insertable-templates";
import {
  ARENAS_CAP,
  ARENAS_DESCRIPTION,
  ARENA_LOWER,
} from "@/wab/shared/Labels";
import { extractComponentUsages } from "@/wab/sites";
import { Dropdown, Menu } from "antd";
import { observer } from "mobx-react-lite";
import React, {
  ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useDebounce, useLocalStorage } from "react-use";
import { FixedSizeList } from "react-window";
import FolderItem from "./FolderItem";
import styles from "./ProjectPanel.module.scss";

const enum SiteItemType {
  arena = "arena",
  page = "page",
  component = "component",
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
    nameWithQueryHighlighting: React.ReactNode;
    type?: DefaultFolderItemProps["type"];
  }[];
};

const heightStorageKey = "studio.ProjectPanel.height";

function useResizingHandle({
  initialHeight,
  maxHeight = Number.MAX_SAFE_INTEGER,
  minHeight = 0,
}: {
  initialHeight: number;
  maxHeight?: number;
  minHeight?: number;
}) {
  const [panelHeight, setPanelHeight] = useLocalStorage(
    heightStorageKey,
    initialHeight
  );

  const [panelTempHeight, setPanelTempHeight] = useState<number | undefined>(
    undefined
  );

  const onDragHandle = useCallback(
    ({ data, mouseEvent }) => {
      mouseEvent.preventDefault();
      window.requestAnimationFrame(() =>
        setPanelTempHeight(
          Math.max(minHeight, Math.min(maxHeight, panelHeight + data.deltaY))
        )
      );
    },
    [panelHeight]
  );

  const onStopDraggingHandle = useCallback(() => {
    setPanelHeight(panelTempHeight);
    setPanelTempHeight(undefined);
  }, [panelTempHeight]);

  return {
    height: panelTempHeight || panelHeight || 0,
    onDragHandle,
    onStopDraggingHandle,
  };
}

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

export const ProjectPanel = observer(function ProjectPanel_() {
  const studioCtx = useStudioCtx();
  const site = studioCtx.site;
  const currentArena = studioCtx.currentArena;
  const contentEditorMode = studioCtx.contentEditorMode;

  const searchInputRef = studioCtx.projectSearchInputRef;
  const [queryMatcher, setQueryMatcher] = useState(mkMatcher());
  const [query, setQuery] = useState("");
  const listRef = useRef<FixedSizeList>(null);
  const [collapsed, setCollapsed] = useState(
    /plasmic levels/i.test(studioCtx.siteInfo.name)
  );
  const [findReferenceComponent, setFindReferenceComponent] = React.useState<
    Component | undefined
  >(undefined);
  const [searchFieldCollapsed, setSearchFieldCollapsed] = useState(!collapsed);
  const [renamingItem, setRenamingItem] = useState<AnyArena | undefined>();

  useDebounce(() => setQueryMatcher(mkMatcher(query)), 200, [query]);

  const {
    height: listHeight,
    onDragHandle,
    onStopDraggingHandle,
  } = useResizingHandle({
    initialHeight: window.innerHeight * 0.2,
    maxHeight: window.innerHeight * 0.5,
    minHeight: 50,
  });

  const getSection = (
    title: string,
    type: SiteItemType,
    items: AnyArena[],
    label?: ReactNode
  ) => {
    const _items = items
      .map(addType(type))
      .filter((it) => {
        const queryMatches = queryMatcher.matches(it.name);
        const queryMatchesPath = queryMatcher.matches(
          (isKnownPageArena(it.item) &&
            it.item.component.pageMeta?.path) as string
        );
        const queryMatchesDescendant =
          isKnownComponentArena(it.item) &&
          getSubComponents(it.item.component).some((comp) =>
            queryMatcher.matches(comp.name)
          );
        return queryMatchesPath || queryMatches || queryMatchesDescendant;
      })
      .map((it) => ({
        ...it,
        nameWithQueryHighlighting: queryMatcher.boldSnippets(it.name),
        pathname: isKnownPageArena(it.item)
          ? queryMatcher.boldSnippets(it.item.component.pageMeta?.path)
          : undefined,
      }));

    return [
      ...(_items.length ? [{ name: title, label: label ?? title }] : []),
      ..._items,
    ];
  };

  const items = [
    ...getSection(
      ARENAS_CAP,
      SiteItemType.arena,
      site.arenas,
      <LabelWithDetailedTooltip tooltip={ARENAS_DESCRIPTION}>
        {ARENAS_CAP}
      </LabelWithDetailedTooltip>
    ),
    ...getSection("Pages", SiteItemType.page, site.pageArenas),
    ...getSection("Components", SiteItemType.component, site.componentArenas),
  ];

  useLayoutEffect(() => {
    if (!searchFieldCollapsed) {
      searchInputRef.current?.focus();
    }
  }, [searchFieldCollapsed]);

  const dismissSearch = () => {
    setQuery("");
    setSearchFieldCollapsed(true);
  };

  const onRequestAdding =
    (itemType: "arena" | "page" | "component") => async () => {
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

          let info: InsertableTemplateExtraInfo | undefined = undefined;
          if (chosenTemplate.projectId && chosenTemplate.componentName) {
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
          }

          await studioCtx.change(({ success }) => {
            const page = studioCtx.addComponent(chosenTemplate.name, {
              type: ComponentType.Page,
            }) as PageComponent;

            if (info) {
              replaceWithPageTemplate(studioCtx, page, info);
            }
            return success();
          });
        }
      }
    };

  const [pageSettings, setPageSettings] = React.useState<
    PageComponent | undefined
  >(undefined);

  if (collapsed) {
    const currentArenaName = switchType(studioCtx.currentArena)
      .when(Arena, (it) => it.name)
      .when(ComponentArena, (it) => it.component.name)
      .when(PageArena, (it) => it.component.name)
      .elseUnsafe(() => "No Arena");

    return (
      <div className={styles.collapsedRoot} onClick={() => setCollapsed(false)}>
        <div className={styles.collapsedArenaLabel}>
          <Icon icon={ChevronRightsvgIcon} className="monochrome-exempt" />
          {currentArenaName}
        </div>
        <div className={styles.collapsedCounter}>
          {items.length - 1} more items
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root} {...testIds.projectPanel}>
      {pageSettings && (
        <TopModal onClose={() => setPageSettings(undefined)}>
          <PageSettings page={pageSettings} />
        </TopModal>
      )}
      <PlasmicProjectPanel
        plusButton={{
          props: {
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
                    <KeyboardShortcut>
                      {getComboForAction("SEARCH_PROJECT_ARENAS")}
                    </KeyboardShortcut>
                  ),
              }}
              onClick={() => {
                if (searchFieldCollapsed) {
                  setSearchFieldCollapsed(false);
                }
              }}
              overrides={{
                searchInput: {
                  ref: searchInputRef,
                  value: query,
                  onChange: (e) => setQuery(e.target.value),
                  onKeyUp: (e) => {
                    if (e.key === "Escape") {
                      dismissSearch();
                    }
                  },
                  onBlur: () => {
                    if (!query) {
                      setSearchFieldCollapsed(true);
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
            currentArena,
          }}
          itemCount={items.length}
          itemSize={32}
          width="100%"
          height={listHeight}
          overscanCount={2}
        >
          {({
            data: {
              items: _items,
              renamingItem: _renamingItem,
              setRenamingItem: _setRenamingItem,
              currentArena: _currentArena,
              setQuery: _setQuery,
            },
            index,
            style,
          }) => {
            const folderItem = _items[index] as ProjectListData["items"][0];

            if (!folderItem.type)
              return (
                <div className={styles.sectionHeader} style={style}>
                  {folderItem.label}
                </div>
              );

            return (
              <FolderItem
                style={style}
                type={folderItem.type}
                isSelected={folderItem.item === _currentArena}
                cleanName={folderItem.name}
                pathname={folderItem.pathname}
                name={folderItem.nameWithQueryHighlighting}
                renaming={_renamingItem === folderItem.item}
                menu={getFolderItemMenuRenderer({
                  folderItem: folderItem,
                  currentArena: _currentArena,
                  setRenamingItem: _setRenamingItem,
                  setFindReferenceComponent: setFindReferenceComponent,
                  studioCtx: studioCtx,
                })}
                onRename={(newName) => {
                  _setRenamingItem(undefined);
                  maybe(
                    studioCtx
                      .siteOps()
                      .tryRenameArena(folderItem.item, newName),
                    (p) => spawn(p)
                  );
                }}
                onClick={() =>
                  studioCtx.changeUnsafe(() => {
                    _setQuery("");
                    studioCtx.switchToArena(folderItem.item);
                  })
                }
                onClickActions={
                  folderItem.type === "page"
                    ? () =>
                        setPageSettings(
                          (folderItem.item as PageArena)
                            .component as PageComponent
                        )
                    : undefined
                }
                tooltipActions={
                  folderItem.type === "page" ? "Page settings" : undefined
                }
                indent={
                  isKnownComponentArena(folderItem.item)
                    ? getSuperComponents(folderItem.item.component).length
                    : 0
                }
              />
            );
          }}
        </FixedSizeList>
      </PlasmicProjectPanel>
      <XDraggable onDrag={onDragHandle} onStop={onStopDraggingHandle}>
        <div className={styles.resizingHandle} />
      </XDraggable>
      {findReferenceComponent && (
        <FindReferencesModal
          studioCtx={studioCtx}
          displayName={getComponentDisplayName(findReferenceComponent)}
          icon={
            <Icon
              icon={ComponentIcon}
              className="component-fg custom-svg-icon--lg monochrome-exempt"
            />
          }
          usageSummary={extractComponentUsages(
            studioCtx.site,
            findReferenceComponent
          )}
          onClose={() => {
            setFindReferenceComponent(undefined);
          }}
        />
      )}
    </div>
  );
});

function getFolderItemMenuRenderer({
  folderItem,
  currentArena,
  setRenamingItem,
  setFindReferenceComponent,
  studioCtx,
}: {
  folderItem: {
    uid: number;
    name: any;
    item: AnyArena;
    nameWithQueryHighlighting: React.ReactNode;
    type?: DefaultFolderItemProps["type"];
  };
  currentArena: AnyArena;
  setRenamingItem: (s: AnyArena) => void;
  setFindReferenceComponent: (c: Component) => void;
  studioCtx: StudioCtx;
}) {
  return () => {
    const component = isDedicatedArena(folderItem.item)
      ? folderItem.item.component
      : undefined;

    const isSubComp = !!component && !!component.superComp;
    const isSuperComp = !!component && component.subComps.length > 0;

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
        ...studioCtx.site.components.map((comp) =>
          componentToReplaceAllInstancesItem(comp)
        )
      ),
      ...studioCtx.site.projectDependencies.flatMap((dep) =>
        menuSection(
          ...dep.site.components.map((comp) =>
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
      studioCtx.changeUnsafe(() => {
        spawn(
          studioCtx.siteOps().tryDuplicatingComponent(component!, {
            focusNewComponent: false,
          })
        );
      });

    const onRename = () => setRenamingItem(folderItem.item);

    const onRequestEditingInNewArtboard = () =>
      studioCtx.changeUnsafe(() =>
        studioCtx.siteOps().createNewFrameForMixedArena(component!)
      );

    const onConvertToComponent = () =>
      studioCtx.changeUnsafe(() =>
        studioCtx.siteOps().convertPageToComponent(component!)
      );

    const onConvertToPage = () =>
      studioCtx.changeUnsafe(() =>
        studioCtx.siteOps().convertComponentToPage(component!)
      );

    const onFindReferences = () => setFindReferenceComponent(component!);

    const onDelete = () =>
      studioCtx.changeUnsafe(() => {
        if (isDedicatedArena(folderItem.item)) {
          studioCtx.siteOps().tryRemoveComponent(folderItem.item.component);
        } else if (isMixedArena(folderItem.item)) {
          studioCtx.siteOps().removeMixedArena(folderItem.item);
        }
      });

    return (
      <Menu onClick={(e) => e.domEvent.stopPropagation()}>
        {menuSection(
          <Menu.Item
            key="references"
            hidden={!shouldShowItem.findReferences}
            onClick={onFindReferences}
          >
            <strong>Find</strong> all references
          </Menu.Item>
        )}
        {menuSection(
          <Menu.Item key="rename" onClick={onRename}>
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
          <Menu.Item
            key="editInNewArtboard"
            hidden={!shouldShowItem.editInNewArtboard}
            onClick={onRequestEditingInNewArtboard}
          >
            <strong>Edit</strong> in new artboard
          </Menu.Item>,
          <Menu.Item
            key="converToComponent"
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
          <Menu.Item
            key="delete"
            onClick={onDelete}
            hidden={!shouldShowItem.delete}
          >
            <strong>Delete</strong> {getSiteItemTypeName(folderItem.item)}
          </Menu.Item>
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
