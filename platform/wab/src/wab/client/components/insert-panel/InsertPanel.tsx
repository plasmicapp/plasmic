import {
  Component,
  isKnownArena,
  isKnownComponent,
  isKnownTplNode,
  ProjectDependency,
  TplNode,
  TplTag,
} from "@/wab/classes";
import { getComponentPresets } from "@/wab/client/code-components/code-presets";
import { useFocusManager } from "@/wab/client/components/aria-utils";
import {
  getFocusedInsertAnchor,
  getValidInsertLocs,
  InsertRelLoc,
} from "@/wab/client/components/canvas/view-ops";
import S from "@/wab/client/components/insert-panel/InsertPanel.module.scss";
import InsertPanelTabGroup from "@/wab/client/components/insert-panel/InsertPanelTabGroup";
import InsertPanelTabItem from "@/wab/client/components/insert-panel/InsertPanelTabItem";
import ListSectionHeader from "@/wab/client/components/ListSectionHeader";
import ListSectionSeparator from "@/wab/client/components/ListSectionSeparator";
import {
  notifiyInstallableFailure,
  notifiyInstallableSuccess,
} from "@/wab/client/components/modals/codeComponentModals";
import { shouldShowHostLessPackage } from "@/wab/client/components/omnibar/Omnibar";
import OmnibarAddItem from "@/wab/client/components/omnibar/OmnibarAddItem";
import { getPlumeImage } from "@/wab/client/components/plume/plume-display-utils";
import {
  createAddHostLessComponent,
  createAddInsertableTemplate,
  createAddInstallable,
  createAddTemplateComponent,
  createAddTplCodeComponents,
  createAddTplComponent,
  createAddTplImage,
  createFakeHostLessComponent,
  createInstallOnlyPackage,
  isInsertable,
  makePlumeInsertables,
} from "@/wab/client/components/studio/add-drawer/AddDrawer";
import AddDrawerItem from "@/wab/client/components/studio/add-drawer/AddDrawerItem";
import { AddItemGroup } from "@/wab/client/components/studio/add-drawer/AddDrawerSection";
import { DraggableInsertable } from "@/wab/client/components/studio/add-drawer/DraggableInsertable";
import { Matcher } from "@/wab/client/components/view-common";
import { TextboxRef } from "@/wab/client/components/widgets/Textbox";
import {
  AddItem,
  AddItemType,
  AddTplItem,
  INSERTABLES_MAP,
  isTplAddItem,
} from "@/wab/client/definitions/insertables";
import { DragInsertManager } from "@/wab/client/Dnd";
import { useVirtualCombobox } from "@/wab/client/hooks/useVirtualCombobox";
import {
  DefaultInsertPanelProps,
  PlasmicInsertPanel,
} from "@/wab/client/plasmic/plasmic_kit_insert_panel/PlasmicInsertPanel";
import {
  normalizeTemplateSpec,
  StudioCtx,
  useStudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { TutorialEventsType } from "@/wab/client/tours/tutorials/tutorials-events";
import { isFlexContainer } from "@/wab/client/utils/tpl-client-utils";
import { createMapFromObject } from "@/wab/collections";
import {
  assertNever,
  delay,
  ensure,
  ensureArray,
  filterFalsy,
  groupConsecBy,
  maybe,
  mergeSane,
  only,
  sliding,
  sortBy,
  spawnWrapper,
} from "@/wab/common";
import { HighlightBlinker } from "@/wab/commons/components/HighlightBlinker";
import {
  CodeComponent,
  getSubComponents,
  getSuperComponents,
  isCodeComponent,
  isCodeComponentWithSection,
  isComponentHiddenFromContentEditor,
  isContextCodeComponent,
  isDefaultComponentKind,
  isReusableComponent,
  isShownHostLessCodeComponent,
  isSubComponent,
  sortComponentsByName,
  tryGetDefaultComponent,
} from "@/wab/components";
import {
  DEVFLAGS,
  flattenInsertableTemplates,
  flattenInsertableTemplatesByType,
  HostLessPackageInfo,
  InsertableTemplatesGroup,
} from "@/wab/devflags";
import { ImageAssetType } from "@/wab/image-asset-type";
import { isIcon } from "@/wab/image-assets";
import { isBuiltinCodeComponent } from "@/wab/shared/code-components/builtin-code-components";
import { FRAMES_CAP } from "@/wab/shared/Labels";
import {
  canInsertAlias,
  canInsertHostlessPackage,
  InsertPanelConfig,
} from "@/wab/shared/ui-config-utils";
import { isHostLessPackage } from "@/wab/sites";
import { SlotSelection } from "@/wab/slots";
import {
  isComponentRoot,
  isTplColumn,
  isTplContainer,
  isTplTextBlock,
} from "@/wab/tpls";
import cn from "classnames";
import { UseComboboxGetItemPropsOptions } from "downshift";
import L, { groupBy, last, uniq } from "lodash";
import memoizeOne from "memoize-one";
import { observer } from "mobx-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { FocusScope } from "react-aria";
import AutoSizer from "react-virtualized-auto-sizer";
import { areEqual, VariableSizeList } from "react-window";

const leftSideWidth = 200;
const rightSideWidth = 330;
const rightSideHPadding = 8;
const scrollbarWidth = 12;
const rightSideContentWidth =
  rightSideWidth - 2 * rightSideHPadding - scrollbarWidth; // 302
const sameRowGap = 5;
const compactPerRow = 3;
const compactItemWidth =
  (rightSideContentWidth - (compactPerRow - 1) * sameRowGap) / compactPerRow; // 97.3333333333

const atomicHostlessSections = [
  "CMS",
  "Design systems",
  "Commerce",
  "Databases",
  "Code Libraries",
];

export interface InsertPanelProps extends DefaultInsertPanelProps {
  onClose: () => any;
}

export const InsertPanel = observer(function InsertPanel_({
  onClose,
  ...props
}: InsertPanelProps) {
  const studioCtx = useStudioCtx();
  const [isDragging, setDragging] = React.useState(false);
  const lastUsedItemsRef = React.useRef<AddItem[]>([]);

  const onInsertedItem = (item: AddItem) => {
    lastUsedItemsRef.current.unshift(item);
    lastUsedItemsRef.current = L.uniqBy(lastUsedItemsRef.current, (x) => x.key);
    if (lastUsedItemsRef.current.length > 3) {
      lastUsedItemsRef.current.length = 3;
    }
    onClose();
  };

  if (!studioCtx.showAddDrawer() && !isDragging) {
    return null;
  }

  return (
    <FocusScope contain>
      <div className={cn(S.addDrawerAnimationWrapper)}>
        <AddDrawerContent
          studioCtx={studioCtx}
          onInsertedItem={onInsertedItem}
          onDragStart={() => {
            setDragging(true);
            onClose();
          }}
          onDragEnd={() => setDragging(false)}
          lastUsedItems={[...lastUsedItemsRef.current]}
        />
      </div>
    </FocusScope>
  );
});
// export const InsertPanel = React.forwardRef(InsertPanel_);
export default InsertPanel;

// The key that defines the recent items OmnibarGroup
const RECENT_GROUP_KEY = "adddrawer-recent";
const shouldShowPreview = (group: AddItemGroup): boolean => {
  // We should only show the preview image in AddDrawer under these conditions
  return (
    group.sectionKey !== "Code Libraries" &&
    group.familyKey !== "imported-packages" &&
    (group.sectionKey === "insertable-templates" ||
      group.familyKey === "hostless-packages" ||
      // All items in the section are like this
      group.items.every((i) => !!i.previewImageUrl || !!i.previewVideoUrl))
  );
};
// Compact only works when we should preview
function shouldShowCompact(virtualItem: VirtualItem) {
  return (
    virtualItem.type === "item" &&
    virtualItem.item.isCompact &&
    shouldShowPreview(virtualItem.group)
  );
}

const AddDrawerContent = observer(function AddDrawerContent(props: {
  studioCtx: StudioCtx;
  onDragStart: () => void;
  onDragEnd: () => void;
  onInsertedItem: (item: AddItem) => void;
  lastUsedItems: AddItem[];
}) {
  const { studioCtx, onDragStart, onDragEnd, onInsertedItem, lastUsedItems } =
    props;
  const inputRef = React.useRef<TextboxRef>(null);
  const contentRef = React.useRef<HTMLElement>(null);
  const listRef = React.useRef<VariableSizeList>(null);
  const focusManager = useFocusManager();

  const vc = studioCtx.focusedViewCtx();

  const [scrollToSection, setScrollToSection] = useState<string | undefined>(
    undefined
  );
  const [highlightSection, setHighlightSection] = useState<string | undefined>(
    undefined
  );

  const filterToTarget = studioCtx.showInlineAddDrawer();
  const [selectedPlacementIndex, setSelectedPlacementIndex] = useState(0);
  const insertLoc =
    getPlacementOptions(studioCtx)[selectedPlacementIndex].insertLoc;

  // We want to "fix" a snapshot of projectDependencies so that we do not change the list when we start dragging, since that somehow causes some drag operations that start below the "project dependencies" section of the menu to break. (Never bothered to get to the bottom of exactly where the confusion originates.)
  const [projectDependencies, setProjectDependencies] = useState(
    studioCtx.site.projectDependencies.slice()
  );

  const allItemGroups = useMemo(
    () =>
      buildAddItemGroups({
        studioCtx,
        matcher: new Matcher(""),
        includeFrames: isKnownArena(studioCtx.currentArena),
        lastUsedItems,
        filterToTarget,
        insertLoc,
        projectDependencies,
      }),
    [studioCtx, lastUsedItems, highlightSection, projectDependencies]
  );

  const allFamilies = groupBy(allItemGroups, (group) => group.familyKey ?? "");
  const allSectionKeysFlattened = uniq(
    Object.values(allFamilies).flatMap((sections) =>
      sections.map((sec) => sec.sectionKey ?? sec.key)
    )
  );

  const [section, setSection] = useState(allSectionKeysFlattened[0]);

  const buildItems = React.useCallback(
    (query: string) => {
      const matcher = new Matcher(query, { matchMiddleOfWord: true });
      const groupedItems = buildAddItemGroups({
        studioCtx: studioCtx,
        matcher: matcher,
        includeFrames: isKnownArena(studioCtx.currentArena),
        lastUsedItems: lastUsedItems,
        filterToTarget,
        insertLoc,
        projectDependencies,
      });

      // We keep track of two parallel lists of items:
      // 1. `virtualItems` -- a list of items that reflect the structure of the virtualized VariableSizeList.
      //    This list contains items that correspond to the actual AddItems, as well as items
      //    for group header and group separators.
      // 2. `items` -- a flat list of AddItems.  This is the list that is managed by Downshift.
      // When we see "index", we need to be careful about which index we mean!

      let itemIndex = 0;
      const isAtomicSection = atomicHostlessSections.includes(section);

      const virtualItems: VirtualItem[] = groupedItems
        .filter((group) => query || (group.sectionKey ?? group.key) === section)
        .flatMap((group, index) => [
          ...(!isAtomicSection && !group.isHeaderLess
            ? [{ type: "header", group } as const]
            : []),
          ...group.items.map(
            (item) =>
              ({ type: "item", item, group, itemIndex: itemIndex++ } as const)
          ),

          ...(!isAtomicSection && index < groupedItems.length - 1
            ? [{ type: "separator" } as const]
            : []),
        ]);

      const items = groupedItems
        .filter((group) => query || (group.sectionKey ?? group.key) === section)
        .flatMap((group) => group.items);

      const virtualRows = groupConsecBy(virtualItems, (item, i) =>
        item.type === "item" ? item.group.key : i
      ).flatMap(([key, group]) => {
        const chunkSize = shouldShowCompact(group[0]) ? compactPerRow : 1;
        return sliding(group, chunkSize, chunkSize);
      });

      return { virtualItems, items, virtualRows };
    },
    [studioCtx, lastUsedItems, section, highlightSection, projectDependencies]
  );

  const {
    virtualRows: virtualRowsRaw,
    getInputProps,
    getItemProps,
    getComboboxProps,
    getMenuProps,
    query,
    highlightedItemIndex,
    setHighlightedItemIndex,
  } = useVirtualCombobox({
    listRef,
    buildItems,
    onSelect: spawnWrapper(async (item) => {
      await onInsert(item);
    }),
    itemToString: (item) => item?.key ?? "",
    alwaysHighlight: true,
  });

  const virtualRows = ensure(virtualRowsRaw, "virtualRows must be set");

  const matcher = new Matcher(query, { matchMiddleOfWord: true });

  const validTplLocs = vc
    ? getValidInsertLocs(vc, getFocusedInsertAnchor(vc))
    : undefined;

  const shouldInterceptOnInsert = (item: AddItem) => {
    if (
      studioCtx.onboardingTourState.triggers.includes(
        TutorialEventsType.TplInserted
      )
    ) {
      studioCtx.tourActionEvents.dispatch({
        type: TutorialEventsType.TplInserted,
        params: {
          itemKey: item.key,
          itemType: item.type,
        },
      });
      return true;
    }

    return false;
  };

  const onInserted = (item: AddItem) => {
    if (shouldInterceptOnInsert(item)) {
      return;
    }

    onInsertedItem(item);
  };

  const onInsert = async (item: AddItem) => {
    if (shouldInterceptOnInsert(item)) {
      return;
    }

    if (!(item.type === AddItemType.fake && item.isPackage)) {
      onInserted(item);
    }

    switch (item.type) {
      case AddItemType.tpl:
      case AddItemType.plume: {
        const component = item.component;
        if (
          component &&
          isCodeComponent(component) &&
          getComponentPresets(studioCtx, component).length > 0
        ) {
          studioCtx.showPresetsModal(component);
        } else {
          await studioCtx.tryInsertTplItem(item);
        }
        break;
      }
      case AddItemType.frame: {
        await studioCtx.changeUnsafe(() => {
          item.onInsert(studioCtx);
        });
        break;
      }
      case AddItemType.installable: {
        try {
          const installed = await DragInsertManager.install(studioCtx, item);
          if (!installed) {
            // Happens when maybe devflag does not have the right info. E.g. there is no arena named "Abc" for devflag installable item `entryPoint: {type: "arena", name: "abc"}`
            throw new Error("Failed to fetch installable info");
          }
          await studioCtx.changeUnsafe(() => {
            if (isKnownArena(installed)) {
              studioCtx.switchToArena(installed);
            } else if (isKnownComponent(installed)) {
              studioCtx.switchToComponentArena(installed);
            }
          });
          notifiyInstallableSuccess(item.label);
        } catch (error) {
          notifiyInstallableFailure(item.label, (error as any).message);
        }
        break;
      }
      case AddItemType.fake: {
        const extraInfo_ = await studioCtx.runFakeItem(item);
        if (item.isPackage && extraInfo_ !== false) {
          const extraInfo: { dep: ProjectDependency[] } = extraInfo_;
          setProjectDependencies(studioCtx.site.projectDependencies.slice());
          await delay(200);
          const sectionKey = item.hostLessPackageInfo?.syntheticPackage
            ? "synthetic-" + item.hostLessPackageInfo.codeName
            : `hostless-packages--${extraInfo.dep[0].projectId}`;
          setSection(sectionKey);
          setHighlightSection(sectionKey);
        }
        break;
      }
    }
  };

  function cycleSection(step: 1 | -1) {
    const index = allSectionKeysFlattened.findIndex((sec) => sec === section);
    const nextSection =
      allSectionKeysFlattened[
        (index + step + allSectionKeysFlattened.length) %
          allSectionKeysFlattened.length
      ];
    setSection(nextSection);
    // This does not work because of some mysterious interaction with the focus tricks we're playing. Not digging into this for now.
    // https://stackoverflow.com/questions/63259596/js-scrollintoview-not-working-with-focus
    setScrollToSection(nextSection);
  }

  return (
    <AddDrawerContext.Provider
      value={{
        studioCtx,
        onDragStart,
        onDragEnd,
        matcher,
        onInserted,
        getItemProps,
        highlightedItemIndex,
        validTplLocs,
        shouldInterceptOnInsert,
      }}
    >
      <PlasmicInsertPanel
        root={{
          props: {
            style: {
              width: rightSideWidth + (query ? 0 : leftSideWidth),
            },
            onKeyDown: (e) => {
              if (e.key === "ArrowDown") {
                if (highlightedItemIndex >= 0) {
                  setHighlightedItemIndex(highlightedItemIndex + 1);
                } else {
                  setHighlightedItemIndex(0);
                }
                inputRef.current && inputRef.current.focus();
              } else if (e.key === "ArrowUp") {
                if (highlightedItemIndex >= 0) {
                  setHighlightedItemIndex(highlightedItemIndex - 1);
                } else {
                  setHighlightedItemIndex(0);
                }
                inputRef.current && inputRef.current.focus();
              } else if (e.key === "PageDown") {
                cycleSection(1);
              } else if (e.key === "PageUp") {
                cycleSection(-1);
              } else if (e.key === "ArrowRight") {
                focusManager.focusNext({ wrap: true });
              } else if (e.key === "ArrowLeft") {
                focusManager.focusPrevious({ wrap: true });
              } else if (e.key.length === 1) {
                inputRef.current && inputRef.current.focus();
              }
            },
            "data-test-id": "add-drawer",
          },
        }}
        sectionsContainer={{
          wrap: (node) => !query && node,
        }}
        leftSearchPanel={{
          ...getInputProps({
            placeholder: "What would you like to insert?",
            autoFocus: true,
            refKey: "ref",
            onKeyDown: spawnWrapper(async (e) => {
              if (e.key === "Escape" && query.trim().length === 0) {
                await studioCtx.changeUnsafe(() => {
                  studioCtx.setShowAddDrawer(false);
                });
              }
            }),
            ref: inputRef as any,
          }),
          wrapperProps: getComboboxProps(),
        }}
        sections={{
          tabIndex: -1,
          children: Object.entries(allFamilies).map(
            ([familyKey, groupsInFamily]) => {
              const allSections = groupBy(
                groupsInFamily,
                (group) => group.sectionKey ?? group.key
              );
              const [someGroupInFamily] = groupsInFamily;
              const children = Object.entries(allSections).map(
                ([sectionKey, groupsInSection]) => {
                  const [someGroupInSection] = groupsInSection;
                  return (
                    <React.Fragment key={sectionKey}>
                      <div style={{ position: "relative", width: "100%" }}>
                        <InsertPanelTabItem
                          key={sectionKey}
                          children={
                            <span>
                              {someGroupInSection.sectionLabel ??
                                someGroupInSection.label}{" "}
                              {scrollToSection === sectionKey && (
                                <div
                                  style={{
                                    width: 0,
                                    height: 0,
                                  }}
                                  ref={(elt) => {
                                    if (elt) {
                                      elt.scrollIntoView({
                                        block: "center",
                                        inline: "center",
                                        behavior: "smooth",
                                      });
                                    }
                                  }}
                                />
                              )}
                              {highlightSection === someGroupInSection.key && (
                                <span className={"NewBadge"}>New</span>
                              )}
                            </span>
                          }
                          onClick={() => {
                            setSection(sectionKey);
                          }}
                          isSelected={section === sectionKey}
                        />
                        {highlightSection === someGroupInSection.key && (
                          <HighlightBlinker doScroll />
                        )}
                      </div>
                    </React.Fragment>
                  );
                }
              );
              return someGroupInFamily.familyLabel ? (
                <InsertPanelTabGroup title={someGroupInFamily.familyLabel}>
                  {children}
                </InsertPanelTabGroup>
              ) : (
                <>{children}</>
              );
            }
          ),
        }}
        content={{
          props: {
            ...getMenuProps({
              "aria-label": "Insert",
              ref: contentRef,
            }),

            key: section,

            children: (
              <AutoSizer>
                {({ width, height }) => {
                  return (
                    <VariableSizeList
                      ref={listRef}
                      itemData={virtualRows}
                      itemCount={virtualRows.length}
                      estimatedItemSize={32}
                      height={height}
                      width={width}
                      overscanCount={2}
                      // We should always use just `index` instead of trying to use the item key,
                      // since items can be repeated and we don't want React DOM to get confused.
                      itemKey={(index) => index}
                      itemSize={(index) => {
                        const virtualItem = virtualRows[index][0];
                        if (!virtualItem) {
                          return 0;
                        } else if (virtualItem.type === "header") {
                          return 64;
                        } else if (virtualItem.type === "item") {
                          if (shouldShowPreview(virtualItem.group)) {
                            return 112;
                          } else {
                            return 32;
                          }
                        } else if (virtualItem.type === "separator") {
                          // separator
                          return 0;
                        } else {
                          assertNever(virtualItem);
                        }
                      }}
                    >
                      {Row}
                    </VariableSizeList>
                  );
                }}
              </AutoSizer>
            ),
          },
        }}
      />
    </AddDrawerContext.Provider>
  );
});

interface AddDrawerContextValue {
  studioCtx: StudioCtx;
  onDragStart: () => void;
  onDragEnd: () => void;
  matcher: Matcher;
  onInserted: (item: AddItem) => void;
  getItemProps: (options: UseComboboxGetItemPropsOptions<AddItem>) => any;
  highlightedItemIndex: number;
  validTplLocs: Set<InsertRelLoc> | undefined;
  shouldInterceptOnInsert?: (item: AddTplItem) => boolean;
}

const AddDrawerContext = React.createContext<AddDrawerContextValue | undefined>(
  undefined
);

type VirtualItem =
  | {
      type: "header";
      group: AddItemGroup;
      item?: never;
    }
  | {
      type: "item";
      item: AddItem;
      group: AddItemGroup;
      itemIndex: number;
    }
  | {
      type: "separator";
      item?: never;
    };

const Row = React.memo(function Row(props: {
  data: VirtualItem[][];
  index: number;
  style: React.CSSProperties;
}) {
  const { style } = props;
  const virtualRow = props.data[props.index];
  const context = ensure(
    React.useContext(AddDrawerContext),
    "AddDrawerContext should exist"
  );

  return (
    <li
      style={{
        ...style,
        display: "flex",
        gap: sameRowGap,
        padding: virtualRow[0].type === "item" ? "8px 8px" : undefined,
      }}
    >
      {virtualRow.map((virtualItem) => {
        if (virtualItem.type === "header") {
          return (
            <ListSectionHeader
              style={{
                paddingTop: 16,
                paddingBottom: 0,
                paddingLeft: 8,
                paddingRight: 8,
              }}
            >
              <span
                style={{
                  textTransform: "uppercase",
                  fontWeight: 500,
                  fontSize: 10,
                  // padding: "24px 16px",
                }}
              >
                {virtualItem.group.label}
              </span>
            </ListSectionHeader>
          );
        } else if (virtualItem.type === "item") {
          const { item, group, itemIndex } = virtualItem;
          const {
            studioCtx,
            onDragStart,
            onDragEnd,
            matcher,
            onInserted,
            getItemProps,
            validTplLocs,
            highlightedItemIndex,
            shouldInterceptOnInsert,
          } = context;

          const indent =
            isTplAddItem(item) && item.component
              ? getSuperComponents(item.component).length
              : 0;

          const showPreview = shouldShowPreview(virtualItem.group);
          const showCompact = shouldShowCompact(virtualItem);
          const width = showCompact ? compactItemWidth : "100%";
          return (
            <li
              {...getItemProps({ item, index: itemIndex })}
              aria-label={item.label}
              data-plasmic-add-item-name={item.systemName ?? item.label}
              role="option"
              className={item.type === "tpl" ? "grabbable" : ""}
              style={{
                width,
                minWidth: width,
                maxWidth: width,
              }}
            >
              <DraggableInsertable
                key={item.key}
                shouldInterceptInsert={shouldInterceptOnInsert}
                sc={studioCtx}
                spec={item as AddTplItem}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              >
                {showPreview ? (
                  <OmnibarAddItem
                    title={item.label}
                    hoverText={
                      item["hostLessPackageInfo"]?.syntheticPackage
                        ? "Show package"
                        : "Install package"
                    }
                    _new={item.isNew}
                    installOnly={item["isPackage"]}
                    preview={
                      item.previewImageUrl
                        ? "image"
                        : item.previewVideoUrl
                        ? "video"
                        : undefined
                    }
                    previewImageUrl={item.previewImageUrl}
                    previewVideoUrl={item.previewVideoUrl}
                    focused={highlightedItemIndex === itemIndex}
                  />
                ) : (
                  <AddDrawerItem
                    key={item.key}
                    studioCtx={studioCtx}
                    item={item}
                    matcher={matcher}
                    isHighlighted={highlightedItemIndex === itemIndex}
                    validTplLocs={validTplLocs}
                    onInserted={() => {
                      onInserted(item);
                    }}
                    indent={indent}
                  />
                )}
              </DraggableInsertable>
            </li>
          );
        } else if (virtualItem.type === "separator") {
          return (
            <ListSectionSeparator
              style={{
                paddingTop: 4,
                padding: 0,
                height: 0,
                background: "none",
                visibility: "hidden",
              }}
            />
          );
        } else {
          assertNever(virtualItem);
        }
      })}
    </li>
  );
},
areEqual);

type HostLessStuff = ReturnType<typeof getHostLess>;
let cachedHostLess: HostLessStuff | undefined = undefined;

const getTemplateComponents = memoizeOne(function getTemplateComponent(
  studioCtx: StudioCtx
) {
  return flattenInsertableTemplatesByType(
    studioCtx.appCtx.appConfig.insertableTemplates,
    "insertable-templates-component"
  );
});

function getHostLess(studioCtx: StudioCtx): AddItemGroup[] {
  const hostLessComponentsMeta =
    studioCtx.appCtx.appConfig.hostLessComponents ??
    DEVFLAGS.hostLessComponents ??
    [];
  return hostLessComponentsMeta
    .filter(
      (meta) =>
        meta.onlyShownIn !== "old" && shouldShowHostLessPackage(studioCtx, meta)
    )
    .map<AddItemGroup>((meta) => {
      const existingDep = ensureArray(meta.projectId).every((projectId) =>
        studioCtx.site.projectDependencies.find(
          (dep) => dep.projectId === projectId
        )
      );
      const isAtomicSection = atomicHostlessSections.includes(
        meta.sectionLabel
      );
      const newVar: AddItemGroup = {
        hostLessPackageInfo: meta,
        key: `hostless-packages--${meta.projectId}`,
        sectionKey: meta.sectionLabel,
        sectionLabel: meta.sectionLabel,
        familyKey: "hostless-packages",
        familyLabel: "Browse component store",
        label: meta.name,
        codeName: meta.codeName,
        codeLink: meta.codeLink,
        items: meta.items
          .filter(
            (item) =>
              (!item.hidden &&
                !item.hiddenOnStore &&
                item.onlyShownIn !== "old") ||
              DEVFLAGS.showHiddenHostLessComponents
          )
          .map((item) => {
            item = {
              ...item,
              displayName: isAtomicSection ? meta.name : item.displayName,
            };
            if (meta.isInstallOnly) {
              return createInstallOnlyPackage(item, meta);
            }
            if (item.isFake) {
              return createFakeHostLessComponent(
                item,
                ensureArray(meta.projectId)
              );
            } else {
              return createAddHostLessComponent(
                item,
                ensureArray(meta.projectId)
              );
            }
          }),
      };
      return newVar;
    });
}

function initHostLess(studioCtx: StudioCtx) {
  if (!cachedHostLess) {
    cachedHostLess = getHostLess(studioCtx);
  }
  return cachedHostLess;
}

/**
 * For hostless components and default components. Otherwise it's a built-in insertable.
 */
const insertPanelAliases = createMapFromObject(
  DEVFLAGS.insertPanelContent.aliases
);

function getLeafProjectIdForHostLessPackageMeta(pkg: HostLessPackageInfo) {
  return last(ensureArray(pkg.projectId));
}

function getCodeComponentsGroups(studioCtx: StudioCtx): AddItemGroup[] {
  // All code components with studio UI will receive a dedicated section
  // in the AddDrawer.
  const components: CodeComponent[] = studioCtx.site.components.filter(
    // Sub components always take in consideration the parent component
    (c): c is CodeComponent =>
      isCodeComponentWithSection(c) && !isSubComponent(c)
  );
  const groups = groupBy(components, (c) => c.codeComponentMeta.section);
  return sortBy(
    Object.entries(groups)
      .map(([section, sectionComponents]) => {
        const subGroups = groupBy(sectionComponents, (c) => {
          const meta = c.codeComponentMeta;
          if (!meta.displayName) {
            return "";
          }
          const parts = meta.displayName.split("/");
          // Remove the last part to get the sub-section
          return parts.length > 1 ? parts.slice(0, -1).join("/") : "";
        });

        return Object.entries(subGroups).map(
          ([subSection, subSectionComponents]) => {
            return {
              key: `code-components-${section}${
                subSection ? `-${subSection}` : ""
              }`,
              isHeaderLess: !subSection,
              sectionKey: section,
              sectionLabel: section,
              label: subSection,
              items: createAddTplCodeComponents(subSectionComponents),
            };
          }
        );
      })
      .flat(),
    (itemGroup) => itemGroup.key
  );
}

export function buildAddItemGroups({
  studioCtx,
  includeFrames = true,
  matcher,
  lastUsedItems = [],
  filterToTarget,
  insertLoc,
  projectDependencies,
}: {
  includeFrames?: boolean;
  studioCtx: StudioCtx;
  matcher: Matcher;
  lastUsedItems?: AddItem[];
  filterToTarget?: boolean;
  insertLoc?: InsertRelLoc;
  projectDependencies: Array<ProjectDependency>;
}): AddItemGroup[] {
  const uiConfig = studioCtx.getCurrentUiConfig();
  const hostlessComponentsInDefaultMenu = new Set<string>();
  const getInsertableTemplatesSection = (group: InsertableTemplatesGroup) => {
    return {
      key: `insertable-templates-${group.name}`,
      sectionKey: group.sectionKey ?? `insertable-templates`,
      sectionLabel: group.sectionLabel ?? "Section templates",
      label: `${group.name}`,
      items: flattenInsertableTemplates(group)
        .filter((item) => item.onlyShownIn !== "old")
        .map(createAddInsertableTemplate),
    };
  };

  const customInsertableTemplates = maybe(uiConfig?.insertableTemplates, (x) =>
    normalizeTemplateSpec(x, false)
  );
  const insertableTemplatesMeta =
    customInsertableTemplates ??
    studioCtx.appCtx.appConfig.insertableTemplates ??
    DEVFLAGS.insertableTemplates;
  const hostLessComponentsMeta =
    studioCtx.appCtx.appConfig.hostLessComponents ??
    DEVFLAGS.hostLessComponents;
  const contentEditorMode = studioCtx.contentEditorMode;
  const isApp = studioCtx.siteInfo.hasAppAuth;
  const builtinSections = mergeSane(
    {},
    DEVFLAGS.insertPanelContent.builtinSections,
    DEVFLAGS.insertPanelContent.overrideSections[isApp ? "app" : "website"]
  );
  const insertPanelConfig: InsertPanelConfig = {
    ...studioCtx.appCtx.appConfig.insertPanelContent,
    builtinSections,
  };

  const canInsertContext = {
    insertPanel: insertPanelConfig,
    hostlessPackages: studioCtx.appCtx.appConfig.hostLessComponents ?? [],
    isContentCreator: contentEditorMode,
  };

  let groupedItems: AddItemGroup[] = filterFalsy([
    // This is the main section/groups.
    // It's meant to list all the basic, "built-in" components.
    //
    // This includes:
    //
    // - built-in elements from INSERTABLES
    // - hostless components - moved a lot of free-floating components out of the component store and into here. So we don't put so much emphasis what components are from which packages, what's installed or not, etc.
    // - antd5 hostless components - form, number/password input, etc. - we may later want to hide some of these if antd5 is not installed?
    // - default-components, which can be Plume (for sites) and hostless antd5 (for apps)
    //
    // So ultimately we just want this to *feel* like a stable list of built-in components. Vs. the chaos before this of even basic things like Button mysteriously disappearing from the list once you insert it.
    //
    // We don't want to just call it "built-in" since you may swap in your own custom components using the default-components system (for a few specific kinds).
    // But generally later we may allow users to more fully customize this menu? TBD.
    ...Object.entries(builtinSections["Default components"]).map(
      ([group, aliases]) =>
        !group.startsWith("__") && {
          sectionKey: "Default components",
          sectionLabel: "Default components",
          key: group,
          label: group,
          items: filterFalsy(
            aliases.map((alias) => {
              if (!canInsertAlias(uiConfig, alias, canInsertContext)) {
                return undefined;
              }
              const resolved = insertPanelAliases.get(alias as any);

              // Is this a built-in insertable?
              if (!resolved) {
                const insertable = INSERTABLES_MAP[alias];
                if (!insertable) {
                  console.warn(
                    "Could not create AddItem for " +
                      alias +
                      " looking in built-in insertables"
                  );
                  return undefined;
                }
                return { ...insertable, isCompact: true };
              }

              // Is this a built-in code component?
              if (resolved.startsWith("builtincc:")) {
                const componentName = resolved.split(":")[1];
                const component = studioCtx.site.components
                  .filter((c) => isBuiltinCodeComponent(c))
                  .find((c) => c.name === componentName);
                if (!component) {
                  return undefined;
                }
                return {
                  ...createAddTplComponent(component),
                  previewImageUrl: `https://plasmic-static1.s3.us-west-2.amazonaws.com/insertables/${alias}.svg`,
                  isCompact: true,
                };
              }

              // Is this a default component entry?
              if (resolved.startsWith("default:")) {
                const kind = resolved.split(":")[1];
                if (!isDefaultComponentKind(kind)) {
                  console.warn("Could not find default component " + alias);
                  return undefined;
                }
                const existingComponent = tryGetDefaultComponent(
                  studioCtx.site,
                  kind
                );
                if (existingComponent) {
                  return {
                    ...createAddTplComponent(existingComponent),
                    previewImageUrl: getPlumeImage(kind),
                    isCompact: true,
                  };
                } else if (
                  canInsertHostlessPackage(uiConfig, "plume", canInsertContext)
                ) {
                  const defaultInsertable =
                    studioCtx.site.flags.defaultInsertable ?? "plume";

                  if (
                    defaultInsertable === "plume" ||
                    DEVFLAGS.runningInCypress
                  ) {
                    return {
                      ...only(makePlumeInsertables(studioCtx, kind)),
                      isCompact: true,
                    };
                  }

                  // The template name for default insertables need to be of format "<defaultInsertable>/<kind>". E.g. For Plexus button, it will be "plexus/button".
                  // The template name will be fetched from devflags.insertableTemplates.
                  return handleTemplateAlias(
                    `${defaultInsertable}/${kind}`,
                    kind
                  );
                } else {
                  return undefined;
                }
              }

              function handleTemplateAlias(
                templateName: string,
                defaultKind?: string
              ) {
                const item = getTemplateComponents(studioCtx).find(
                  (i) => i.templateName === templateName
                );
                if (item) {
                  return {
                    ...createAddTemplateComponent(item, defaultKind),
                    isCompact: true,
                  };
                }
                return undefined;
              }

              if (resolved.startsWith("template:")) {
                const templateName = resolved.split(":")[1];
                // ASK: Previously, it only returned if a template was found. Is it OK to return undefined if the template isn't found?
                return handleTemplateAlias(templateName);
              }

              // Is this a hostless component entry?
              for (const hostlessGroup of initHostLess(studioCtx) ?? []) {
                if (
                  canInsertHostlessPackage(
                    uiConfig,
                    hostlessGroup.codeName ?? "",
                    canInsertContext
                  )
                ) {
                  for (const item of hostlessGroup.items) {
                    if (item.key === "hostless-component-" + resolved) {
                      hostlessComponentsInDefaultMenu.add(item.key);
                      return { ...item, isCompact: true };
                    }
                  }
                }
              }

              console.warn(
                "Could not create AddItem for " +
                  alias +
                  " resolved to " +
                  resolved
              );
              return undefined;
            })
          ),
        }
    ),

    // Code components groups
    ...getCodeComponentsGroups(studioCtx),

    includeFrames &&
      canInsertAlias(uiConfig, "frame", canInsertContext) && {
        key: "frames",
        label: FRAMES_CAP,
        items: [
          INSERTABLES_MAP.pageFrame,
          INSERTABLES_MAP.componentFrame,
          INSERTABLES_MAP.screenFrame,
        ],
      },

    // Custom components includes all the components from the project
    {
      key: "components",
      label: "Custom components",
      items: sortComponentsByName(
        studioCtx.site.components.filter(
          (c) =>
            isReusableComponent(c) &&
            !isContextCodeComponent(c) &&
            !isCodeComponentWithSection(c) &&
            !(
              contentEditorMode &&
              isComponentHiddenFromContentEditor(c, studioCtx)
            ) &&
            !isBuiltinCodeComponent(c)
        )
      ).map((comp) => createAddTplComponent(comp)),
    },

    // Insertable Templates
    ...(!isApp &&
    (!contentEditorMode || customInsertableTemplates) &&
    !!insertableTemplatesMeta
      ? insertableTemplatesMeta.items
          .filter(
            (i) =>
              i.type === "insertable-templates-group" &&
              i.onlyShownIn !== "old" &&
              !i.isPageTemplatesGroup
          )
          .map((g) =>
            getInsertableTemplatesSection(g as InsertableTemplatesGroup)
          )
      : []),

    canInsertAlias(uiConfig, "icon", canInsertContext) && {
      key: "icons",
      label: "Icons",
      items: studioCtx.site.imageAssets
        .filter((asset) => isIcon(asset))
        .map((asset) => createAddTplImage(asset)),
    },

    canInsertAlias(uiConfig, "image", canInsertContext) && {
      key: "images",
      label: "Images",
      items: studioCtx.site.imageAssets
        .filter(
          (asset) => asset.type === ImageAssetType.Picture && asset.dataUri
        )
        .map((asset) => createAddTplImage(asset)),
    },

    // Plume components.
    // List both un-materialized and all materialized Plume components.
    // We only show this section if the Plume design system was explicitly installed.
    // Normally, for apps, users use Ant, and for websites, users use Plume via the Default Components menu.
    // You would only need to see this section if:
    //
    // - Your default components are Ant (or any other non-Plume), but still want to check out / use Plume components.
    // - You spot the Plume fake package in the component store and want to check it out.
    //
    // The Plume package is not a real package!
    // You can choose to show the package, but it's temporary to the session.
    // The section won't show when you re-open the project, you need to choose to re-show it.
    canInsertHostlessPackage(uiConfig, "plume", canInsertContext) &&
      studioCtx.shownSyntheticSections.get("plume") && {
        key: "synthetic-plume",
        label: 'Customizable "headless" components',
        sectionLabel: "Headless components",
        familyKey: "imported-packages",
        familyLabel: "Imported packages",
        items: sortBy(
          [
            ...sortComponentsByName(
              studioCtx.site.components.filter((c) => c.plumeInfo)
            ).map((comp) => createAddTplComponent(comp)),
            ...makePlumeInsertables(studioCtx).map((item) => ({
              ...item,
              previewImageUrl: undefined,
            })),
          ],
          (item) => item.label.toLowerCase()
        ),
      },

    studioCtx.appCtx.appConfig.plexusEnabled
      ? {
          key: "ui-kits",
          sectionLabel: "Design systems",
          sectionKey: "Design systems",
          familyKey: "hostless-packages",
          familyLabel: "Browse component store",
          items: studioCtx.appCtx.appConfig.installables
            .filter((item) => item.type === "ui-kit")
            .map(createAddInstallable),
        }
      : undefined,

    canInsertHostlessPackage(uiConfig, "unstyled", canInsertContext) &&
      studioCtx.shownSyntheticSections.get("unstyled") && {
        key: "synthetic-unstyled",
        label: "More HTML elements",
        sectionLabel: "More HTML elements",
        familyKey: "imported-packages",
        familyLabel: "Imported packages",
        items: [
          INSERTABLES_MAP.button,
          INSERTABLES_MAP.textbox,
          INSERTABLES_MAP.password,
          INSERTABLES_MAP.textarea,
          INSERTABLES_MAP.ul,
          INSERTABLES_MAP.ol,
          INSERTABLES_MAP.li,
        ],
      },

    ...projectDependencies.map((dep) => ({
      key: isHostLessPackage(dep.site)
        ? `hostless-packages--${dep.projectId}`
        : dep.pkgId,
      label:
        hostLessComponentsMeta?.flatMap((pkg) => {
          return getLeafProjectIdForHostLessPackageMeta(pkg) ===
            dep.projectId &&
            pkg.onlyShownIn !== "old" &&
            shouldShowHostLessPackage(studioCtx, pkg)
            ? [pkg.name]
            : [];
        })[0] ?? dep.name,
      familyKey: "imported-packages",
      familyLabel: "Imported packages",
      items: [
        ...sortComponentsByName(
          dep.site.components.filter(
            (c) =>
              isReusableComponent(c) &&
              (!isCodeComponent(c) ||
                isShownHostLessCodeComponent(c, hostLessComponentsMeta)) &&
              !isContextCodeComponent(c) &&
              // There are certain packages, like plasmic-basic-components or plasmic-embed-css,
              // that should feel like built-ins (in the "Default components") - it's confusing to suddenly show them as installed.
              !(hostLessComponentsMeta ?? []).some(
                (group) =>
                  getLeafProjectIdForHostLessPackageMeta(group) ===
                    dep.projectId && group.hiddenWhenInstalled
              )
          )
        ).map((comp) => createAddTplComponent(comp)),
        ...dep.site.imageAssets
          .filter((asset) => asset.dataUri)
          .map((asset) => createAddTplImage(asset)),
      ],
    })),

    ...(!!hostLessComponentsMeta && cachedHostLess
      ? // We want to hide the listings that were shown in "Default components" - this is just a simple way to ensure things don't show up in both menus.
        cachedHostLess
          .filter((group) =>
            canInsertHostlessPackage(
              uiConfig,
              group.codeName!,
              canInsertContext
            )
          )
          .map((group) => ({
            ...group,
            items: group.items.filter(
              (item) => !hostlessComponentsInDefaultMenu.has(item.key)
            ),
          }))
      : []),
  ]);

  groupedItems = groupedItems.map((group) => ({
    ...group,
    items: [...group.items],
  }));

  // We clone all items to avoid having duplicates in groupedItems, because
  // that can cause issues with react-window's lists.
  groupedItems.forEach((group) => {
    group.items = group.items.map((i) => L.clone(i));
  });

  if (matcher.hasQuery()) {
    groupedItems.forEach((group) => {
      const unmatchedItems = new Set(
        group.items.filter(
          (item) =>
            !matcher.matches(item.label) &&
            (!item.systemName || !matcher.matches(item.systemName))
        )
      );
      const superAndSubCompsOfMatchedComponents = new Set<Component>();
      group.items.forEach((item) => {
        if (
          matcher.matches(item.label) &&
          item.type === AddItemType.tpl &&
          !!item.component
        ) {
          [
            ...getSuperComponents(item.component),
            ...getSubComponents(item.component),
          ].forEach((c) => superAndSubCompsOfMatchedComponents.add(c));
        }
      });
      group.items.forEach((item) => {
        if (
          item.type === AddItemType.tpl &&
          !!item.component &&
          superAndSubCompsOfMatchedComponents.has(item.component)
        ) {
          unmatchedItems.delete(item);
        }
      });
      group.items = group.items.filter(
        (item) =>
          !(group.key === "Common" && group.familyKey === undefined) &&
          !unmatchedItems.has(item)
      );
    });
  }

  if (filterToTarget) {
    let target: TplNode | SlotSelection | null = null;
    const vc = studioCtx.focusedViewCtx();
    if (vc) {
      target = vc.focusedTplOrSlotSelection();
      if (target) {
        for (const group of groupedItems) {
          group.items = group.items.filter((item) =>
            isInsertable(item, vc, target!, insertLoc)
          );
        }
        lastUsedItems = lastUsedItems.filter((item) =>
          isInsertable(item, vc, target!, insertLoc)
        );
      }
    }
  }

  if (lastUsedItems.length > 0) {
    const validLastUsedItems = lastUsedItems.filter((x) =>
      groupedItems.some((group) => group.items.includes(x))
    );

    if (validLastUsedItems.length > 0) {
      groupedItems.unshift({
        key: RECENT_GROUP_KEY,
        label: "Recently Used...",
        // Note: useCombobox will do shallow comparisons and get confused when there are 2 identical elements
        // For example, highlightedIndex will be set to the first occurrence, leading to a lot of jumping around
        // By just cloning this, we can keep the items distinct
        items: [...validLastUsedItems.map((i) => L.clone(i))],
      });
    }
  }

  return groupedItems.filter((group) => group.items.length > 0);
}

function getPlacementOptions(studioCtx: StudioCtx) {
  const viewCtx = studioCtx.focusedViewCtx();
  const focusedNode = viewCtx?.focusedTplOrSlotSelection();

  const _isComponentRoot =
    isKnownTplNode(focusedNode) && isComponentRoot(focusedNode);
  const isSlot = focusedNode instanceof SlotSelection;
  const isContainer =
    isKnownTplNode(focusedNode) && isTplContainer(focusedNode);
  const isColumn = isKnownTplNode(focusedNode) && isTplColumn(focusedNode);
  const isEmpty = (focusedNode as TplTag)?.children?.length === 0;
  const isMarkerTpl =
    isKnownTplNode(focusedNode) && isTplTextBlock(focusedNode.parent);

  const parentIsFlexContainer =
    isKnownTplNode(focusedNode) &&
    isFlexContainer((focusedNode as TplNode).parent, viewCtx);

  if (!isContainer && !isSlot && !isColumn) {
    return [
      { label: "Before", insertLoc: InsertRelLoc.before },
      { label: "After", insertLoc: InsertRelLoc.after, default: true },
    ];
  }

  if (_isComponentRoot || isSlot || isColumn || isMarkerTpl) {
    return [{ label: "Inside", insertLoc: InsertRelLoc.append }];
  }

  const preferToInsertInside = isEmpty || !parentIsFlexContainer;

  return [
    { label: "Before", insertLoc: InsertRelLoc.before },
    {
      label: "Inside",
      insertLoc: InsertRelLoc.append,
      default: preferToInsertInside,
    },
    {
      label: "After",
      insertLoc: InsertRelLoc.after,
      default: !preferToInsertInside,
    },
  ];
}
