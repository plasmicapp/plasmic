import { isKnownArena } from "@/wab/classes";
/** @format */

import {
  Arena,
  ArenaFrame,
  ComponentArena,
  PageArena,
  ProjectDependency,
  Site,
  TplNode,
} from "@/wab/classes";
import { getComponentPresets } from "@/wab/client/code-components/code-presets";
import { InsertRelLoc } from "@/wab/client/components/canvas/view-ops";
import { checkAndNotifyUnsupportedHostVersion } from "@/wab/client/components/modals/codeComponentModals";
import {
  createAddComponentPreset,
  createAddHostLessComponent,
  createAddInsertableIcon,
  createAddInsertableTemplate,
  createAddTplComponent,
  createAddTplImage,
  createFakeHostLessComponent,
  isInsertable,
  makePlumeInsertables,
  maybeShowGlobalContextNotification,
} from "@/wab/client/components/studio/add-drawer/AddDrawer";
import { Matcher } from "@/wab/client/components/view-common";
import Button from "@/wab/client/components/widgets/Button";
import { TextboxRef } from "@/wab/client/components/widgets/Textbox";
import {
  CommandItem,
  CommandItemKey,
  CommandItemType,
  COMMANDS_MAP,
} from "@/wab/client/definitions/commands";
import {
  AddItem,
  AddItemType,
  INSERTABLES_MAP,
  isAddItem,
  isTplAddItem,
} from "@/wab/client/definitions/insertables";
import { FRAME_ICON } from "@/wab/client/icons";
import {
  DefaultOmnibarProps,
  PlasmicOmnibar,
} from "@/wab/client/plasmic/plasmic_kit_omnibar/PlasmicOmnibar";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  asyncFilter,
  ensureArray,
  filterFalsy,
  removeWhere,
  spawn,
} from "@/wab/common";
import {
  getComponentDisplayName,
  isCodeComponent,
  isReusableComponent,
} from "@/wab/components";
import {
  DEVFLAGS,
  flattenInsertableIconGroups,
  flattenInsertableTemplates,
  HostLessPackageInfo,
  InsertableTemplatesGroup,
} from "@/wab/devflags";
import { ImageAssetType } from "@/wab/image-asset-type";
import { isIcon } from "@/wab/image-assets";
import { getArenaFrameDesc, getArenaFrames } from "@/wab/shared/Arenas";
import { allComponents } from "@/wab/sites";
import { SlotSelection } from "@/wab/slots";
import { useCombobox } from "downshift";
import L from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import OmnibarGroup from "./OmnibarGroup";

// The key that defines the recent items OmnibarGroup
const RECENT_GROUP_KEY = "omnibar-recent";
// The prefix that's added to item keys when they're in the recent list
const RECENT_KEY_PREFIX = "recent-";
const toRecentKey = (key: string): string =>
  key.includes(RECENT_KEY_PREFIX) ? key : `${RECENT_KEY_PREFIX}-${key}`;

export type OmnibarItem = AddItem | CommandItem;

/**
 * Used in StudioCtx to store the current state of the Omnibar
 */
export interface OmnibarState {
  // Should we show the omnibar?
  show: boolean;
  // Only include these groups. If undefined, include everything
  includedGroupKeys?: string[];
  // Of remaining groups, explicitly exclude these
  excludedGroupKeys?: string[];
}

export interface OmnibarGroupData {
  key: string;
  tab: OmnibarTabNames;
  label: string;
  codeName?: string;
  codeLink?: string;
  items: OmnibarItem[];
  rightBtn?: React.ReactNode;
  showInstall?: boolean;
}

export enum OmnibarTabNames {
  all = "allTab",
  insert = "insertTab",
  focus = "focusTab",
  new = "newTab",
  run = "runTab",
}

interface OmnibarProps extends DefaultOmnibarProps {
  studioCtx: StudioCtx;
  lastUsedItemsRef: React.MutableRefObject<OmnibarItem[]>;
  onClose: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export const Omnibar = observer(function Omnibar(props: OmnibarProps) {
  const {
    studioCtx,
    lastUsedItemsRef,
    onClose,
    onDragStart,
    onDragEnd,
    ...rest
  } = props;
  const omnibarState = studioCtx.getOmnibarState();
  const [query, setQuery] = React.useState("");
  const [selectedTab, setSelectedTab] = React.useState(OmnibarTabNames.all);
  const [isShiftDown, setIsShiftDown] = React.useState(false);
  const inputRef = React.useRef<TextboxRef>(null);
  const contentRef = React.useRef<HTMLElement>(null);

  const matcher = new Matcher(query, { matchMiddleOfWord: true });
  const excludedGroupKeys = [
    ...(omnibarState.excludedGroupKeys ?? []),
    ...(!isKnownArena(studioCtx.currentArena) ? ["frames"] : []),
  ];
  const excludedItemKeys = !isKnownArena(studioCtx.currentArena)
    ? [
        CommandItemKey.componentFrame,
        CommandItemKey.pageFrame,
        CommandItemKey.screenFrame,
      ]
    : undefined;
  const [groupedItems, setGroupedItems] = React.useState<OmnibarGroupData[]>(
    []
  );
  React.useEffect(() => {
    spawn(
      (async () => {
        const items = await buildOmnibarItemGroups({
          studioCtx,
          matcher,
          selectedTab,
          lastUsedItems: lastUsedItemsRef.current,
          includedGroupKeys: omnibarState.includedGroupKeys,
          excludedGroupKeys,
          excludedItemKeys,
        });
        setGroupedItems(items);
      })()
    );
  }, [groupedItems]);

  // The total ordering of all items to pass into downshift
  const items = groupedItems.flatMap((group) => group.items);
  const getItemIndex = (i: OmnibarItem) => items.indexOf(i);

  const {
    highlightedIndex,
    getInputProps,
    getItemProps,
    getComboboxProps,
    getMenuProps,
    setHighlightedIndex,
  } = useCombobox({
    isOpen: true,
    defaultIsOpen: true,
    items,
    selectedItem: null,
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) {
        spawn(performAction(selectedItem));
      }
    },
    itemToString: (item) => item?.key ?? "",
    onStateChange: (changes) => {},
    stateReducer: (state, { type, changes }) => {
      return changes;
    },
  });

  const onCompleted = (item: OmnibarItem) => {
    setQuery("");

    // Save the 3 most recently used items
    // Note: We have to duplicate it with a new key so that
    // it can be rendered along-side the original ite
    const duplicatedItem = {
      ...item,
      key: toRecentKey(item.key),
    } as OmnibarItem;
    lastUsedItemsRef.current.unshift(duplicatedItem);
    lastUsedItemsRef.current = L.uniqBy(lastUsedItemsRef.current, (x) => x.key);
    if (lastUsedItemsRef.current.length > 3) {
      lastUsedItemsRef.current.length = 3;
    }

    onClose();
  };

  const performAction = async (item: OmnibarItem) => {
    onCompleted(item);
    if (isAddItem(item) && isTplAddItem(item)) {
      await studioCtx.tryInsertTplItem(item);
    } else if (item.type === AddItemType.frame) {
      await studioCtx.changeUnsafe(() => {
        item.onInsert(studioCtx);
      });
    } else if (item.type === AddItemType.fake) {
      await studioCtx.runFakeItem(item);
    } else if (L.values(CommandItemType).includes(item.type)) {
      await item.action(studioCtx);
    }
  };

  const buildTabs = () => {
    const result = {};
    L.values(OmnibarTabNames).forEach((name) => {
      result[name] = {
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          setSelectedTab(name);
        },
        selected: selectedTab === name,
      };
    });
    return result;
  };

  // Used to prevent the Blur event from dismissing the overlay
  const ignoreQueryBlurEvent = React.useRef(false);
  return (
    <PlasmicOmnibar
      {...rest}
      {...buildTabs()}
      style={{
        maxHeight: "calc(100vh - 128px)",
      }}
      // Hide the tabs if we are limiting which groups are shown
      tabless={!!omnibarState.includedGroupKeys}
      onMouseDown={() => {
        ignoreQueryBlurEvent.current = true;
        setTimeout(() => (ignoreQueryBlurEvent.current = false), 100);
      }}
      query={{
        ...getInputProps({
          placeholder: "Element, template, component, or image...",
          autoFocus: true,
          refKey: "ref",
          ref: inputRef as any,
          onChange: (e) => {
            e.stopPropagation();
            setQuery(e.currentTarget.value);
          },
          onFocus: () => {
            if (highlightedIndex < 0) {
              setHighlightedIndex(0);
            }
          },
          onKeyDown: (e) => {
            e.stopPropagation();
            if (e.key === "Escape") {
              spawn(studioCtx.changeUnsafe(() => studioCtx.hideOmnibar()));
            } else if (e.key === "Tab") {
              // Cycle through the tabs
              const tabs = L.values(OmnibarTabNames);
              const currIndex = tabs.indexOf(selectedTab);
              let nextIndex = !isShiftDown ? currIndex + 1 : currIndex - 1;
              if (nextIndex < 0) {
                nextIndex = tabs.length - 1;
              } else if (nextIndex >= tabs.length) {
                nextIndex = 0;
              }
              setSelectedTab(tabs[nextIndex]);
            } else if (e.key === "Shift") {
              setIsShiftDown(true);
            }
          },
          onKeyUp: (e) => {
            if (e.key === "Shift") {
              setIsShiftDown(false);
            }
          },
          onBlur: (e) => {
            if (ignoreQueryBlurEvent.current) {
              e.stopPropagation();
            }
          },
        }),
        value: query,
      }}
      content={{
        props: {
          ...getMenuProps({
            "aria-label": "Omnibar",
            ref: contentRef,
          }),
          // Make the drawer focusable (but not in the tab order), so that
          // clicking on an option here will not blurWithin, closing the
          // popup.
          tabIndex: -1,
          className: "no-select",
        },
      }}
      root={{
        props: {
          ...getComboboxProps(),
        },
      }}
    >
      {groupedItems.map((group) => (
        <OmnibarGroup
          studioCtx={studioCtx}
          key={group.key}
          data={group}
          highlightedIndex={highlightedIndex}
          getItemProps={getItemProps}
          getItemIndex={getItemIndex}
          onDragStart={onDragStart}
          onDragEnd={(i: OmnibarItem) => {
            onDragEnd();
            onCompleted(i);
          }}
          coerceRows={group.key === RECENT_GROUP_KEY}
        />
      ))}
    </PlasmicOmnibar>
  );
});

export function shouldShowHostLessPackage(
  studioCtx: StudioCtx,
  meta: HostLessPackageInfo
) {
  if (meta.hidden) {
    if (meta.whitelistDomains) {
      const domain = studioCtx.appCtx.selfInfo?.email.split("@")[1];
      if (domain && meta.whitelistDomains.includes(domain)) {
        return true;
      }
    }
    if (
      meta.whitelistTeams &&
      studioCtx.siteInfo.teamId &&
      meta.whitelistTeams.includes(studioCtx.siteInfo.teamId)
    ) {
      return true;
    }
    return false;
  }
  return true;
}
export async function buildOmnibarItemGroups({
  studioCtx,
  matcher,
  selectedTab,
  lastUsedItems,
  includedGroupKeys,
  excludedGroupKeys = [],
  excludedItemKeys = [],
  filterToTarget,
  insertLoc,
}: {
  studioCtx: StudioCtx;
  matcher: Matcher;
  selectedTab: OmnibarTabNames;
  lastUsedItems: OmnibarItem[];
  includedGroupKeys?: string[];
  excludedGroupKeys?: string[];
  excludedItemKeys?: string[];
  filterToTarget?: boolean;
  insertLoc?: InsertRelLoc;
}): Promise<OmnibarGroupData[]> {
  const insertableTemplatesMeta =
    studioCtx.appCtx.appConfig.insertableTemplates ??
    DEVFLAGS.insertableTemplates;
  const hostLessComponentsMeta = (
    studioCtx.appCtx.appConfig.hostLessComponents ?? DEVFLAGS.hostLessComponents
  )?.filter((meta) => shouldShowHostLessPackage(studioCtx, meta));
  const getInsertableTemplatesSection = (group: InsertableTemplatesGroup) => {
    return {
      key: `insertable-templates-${group.name}`,
      tab: OmnibarTabNames.insert,
      label: `${group.name}`,
      items: flattenInsertableTemplates(group)
        .filter((i) => i.onlyShownIn !== "new")
        .map(createAddInsertableTemplate),
    };
  };

  const groupedItems: OmnibarGroupData[] = filterFalsy<OmnibarGroupData>([
    {
      key: RECENT_GROUP_KEY,
      tab: OmnibarTabNames.all,
      label: "Recently Used...",
      items: lastUsedItems,
    },
    {
      key: "frames",
      tab: OmnibarTabNames.new,
      label: "Create",
      items: [
        COMMANDS_MAP.pageFrame,
        COMMANDS_MAP.componentFrame,
        COMMANDS_MAP.screenFrame,
      ],
    },

    {
      key: "basics",
      tab: OmnibarTabNames.insert,
      label: "Basics",
      items: [
        INSERTABLES_MAP.hstack,
        INSERTABLES_MAP.vstack,
        INSERTABLES_MAP.box,
        INSERTABLES_MAP.text,
        INSERTABLES_MAP.image,
        INSERTABLES_MAP.icon,
        INSERTABLES_MAP.columns,
        ...(DEVFLAGS.demo ? [INSERTABLES_MAP.grid] : []),
      ],
    },

    {
      key: "components",
      tab: OmnibarTabNames.insert,
      label: "Project Components",
      items: studioCtx.site.components
        .filter((c) => isReusableComponent(c) && !isCodeComponent(c))
        .map((comp) => createAddTplComponent(comp)),
    },

    {
      key: "code-components",
      tab: OmnibarTabNames.insert,
      label: "Code Components",
      items: studioCtx.site.components
        .filter((c) => isReusableComponent(c) && isCodeComponent(c))
        .map((comp) => createAddTplComponent(comp)),
    },

    {
      key: "unstyled",
      tab: OmnibarTabNames.insert,
      label: "Unstyled Elements",
      items: [
        INSERTABLES_MAP.button,
        INSERTABLES_MAP.textbox,
        INSERTABLES_MAP.password,
        INSERTABLES_MAP.textarea,
        INSERTABLES_MAP.link,
        INSERTABLES_MAP.heading,
      ],
    },

    {
      key: "icons",
      tab: OmnibarTabNames.insert,
      label: "Icons",
      items: studioCtx.site.imageAssets
        .filter((asset) => isIcon(asset))
        .map((asset) => createAddTplImage(asset)),
    },

    {
      key: "images",
      tab: OmnibarTabNames.insert,
      label: "Images",
      items: studioCtx.site.imageAssets
        .filter(
          (asset) => asset.type === ImageAssetType.Picture && asset.dataUri
        )
        .map((asset) => createAddTplImage(asset)),
    },

    ...studioCtx.site.projectDependencies.map((dep) => ({
      key: dep.pkgId,
      tab: OmnibarTabNames.insert,
      label: `Imported from "${dep.name}" (${dep.version})`,
      items: [
        ...dep.site.components
          .filter((c) => isReusableComponent(c) && !isCodeComponent(c))
          .map((comp) => createAddTplComponent(comp)),
        ...dep.site.imageAssets
          .filter((asset) => asset.dataUri)
          .map((asset) => createAddTplImage(asset)),
      ],
    })),

    // Plume components
    {
      key: "plume-templates",
      tab: OmnibarTabNames.insert,
      label: "Interactive Components",
      items: makePlumeInsertables(studioCtx),
    },

    // Insertable templates: create a section per group
    ...(insertableTemplatesMeta
      ? insertableTemplatesMeta.items
          .filter(
            (i) =>
              i.type === "insertable-templates-group" &&
              i.onlyShownIn !== "new" &&
              !i.isPageTemplatesGroup
          )
          .map((g) =>
            getInsertableTemplatesSection(g as InsertableTemplatesGroup)
          )
      : []),

    // Insertable templates: catch remaining templates into "Other"
    !!insertableTemplatesMeta &&
      getInsertableTemplatesSection({
        type: "insertable-templates-group",
        name: "Other",
        items: insertableTemplatesMeta.items.filter(
          (i) => i.type === "insertable-templates-item"
        ),
      }),

    // Insertable Icons
    !!insertableTemplatesMeta && {
      key: "insertable-icons",
      tab: OmnibarTabNames.insert,
      label: "Insertable Icons",
      items: [
        ...L.flatMap(
          flattenInsertableIconGroups(insertableTemplatesMeta),
          (m) => studioCtx.projectDependencyManager.getInsertableIcons(m)
        ).map((i) => createAddInsertableIcon(i)),
      ],
    },

    ...(DEVFLAGS.showHostLessComponents && hostLessComponentsMeta
      ? await Promise.all(
          hostLessComponentsMeta
            .filter((meta) => meta.onlyShownIn !== "new")
            .map<Promise<OmnibarGroupData>>(async (meta) => {
              const existingDep = ensureArray(meta.projectId).every(
                (projectId) =>
                  studioCtx.site.projectDependencies.find(
                    (dep) => dep.projectId === projectId
                  )
              );
              return {
                key: "hostless-package",
                tab: OmnibarTabNames.insert,
                label: meta.name,
                codeName: meta.codeName,
                codeLink: meta.codeLink,
                showInstall: meta.showInstall,
                items: meta.items
                  .filter(
                    (item) =>
                      (!item.hidden &&
                        !item.hiddenOnStore &&
                        item.onlyShownIn !== "new") ||
                      DEVFLAGS.showHiddenHostLessComponents
                  )
                  .map((item) => {
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
                rightBtn: (
                  <Button
                    type={existingDep ? "secondary" : "primary"}
                    size="small"
                    disabled={!!existingDep}
                    onClick={async () => {
                      if (existingDep) {
                        // await studioCtx.projectDependencyManager.removeByPkgId(
                        //   existingDep.pkgId
                        // );
                      } else {
                        if (checkAndNotifyUnsupportedHostVersion()) {
                          return;
                        }

                        const projectDependencies: ProjectDependency[] = [];
                        const missingDeps = ensureArray(meta.projectId).filter(
                          (projectId) =>
                            !studioCtx.site.projectDependencies.find(
                              (dep) => dep.projectId === projectId
                            )
                        );
                        for (const id of missingDeps) {
                          projectDependencies.push(
                            await studioCtx.projectDependencyManager.addByProjectId(
                              id
                            )
                          );
                        }

                        projectDependencies.forEach((projectDependency) =>
                          maybeShowGlobalContextNotification(
                            studioCtx,
                            projectDependency
                          )
                        );
                      }
                    }}
                  >
                    {existingDep ? "Installed" : "Install"}
                  </Button>
                ),
              };
            })
        )
      : []),

    // Component templates
    ...(DEVFLAGS.preset
      ? allComponents(studioCtx.site, { includeDeps: "all" })
          .filter(isCodeComponent)
          .map((c) => ({
            key: "presets-" + c.uuid,
            tab: OmnibarTabNames.insert,
            label: "Component templates for " + getComponentDisplayName(c),
            items: getComponentPresets(studioCtx, c).map((preset) =>
              createAddComponentPreset(studioCtx, c, preset)
            ),
          }))
      : []),

    // Run commands
    {
      key: "run-commands",
      tab: OmnibarTabNames.run,
      label: "Run",
      items: [
        COMMANDS_MAP.gotoDashboard,
        COMMANDS_MAP.importProject,
        COMMANDS_MAP.cloneProject,
      ],
    },

    // Focus Arenas
    {
      key: "focus-arenas",
      tab: OmnibarTabNames.focus,
      label: "Arenas",
      items: [
        ...L.flatMap(studioCtx.site.arenas, (arena) =>
          getArenaFrames(arena).map((frame) =>
            createFocusArena(studioCtx.site, arena, frame)
          )
        ),
      ],
    },

    // Focus Page Arenas
    {
      key: "focus-page-arenas",
      tab: OmnibarTabNames.focus,
      label: "Page Arenas",
      items: [
        ...studioCtx.site.pageArenas.map((a) =>
          createFocusArena(studioCtx.site, a)
        ),
      ],
    },

    // Focus Component Arenas
    {
      key: "focus-component-arenas",
      tab: OmnibarTabNames.focus,
      label: "Component Arenas",
      items: [
        ...L.flatMap(studioCtx.site.componentArenas, (arena) =>
          getArenaFrames(arena).map((frame) =>
            createFocusArena(studioCtx.site, arena, frame)
          )
        ),
      ],
    },
  ]);

  // Filter out groups that don't match the tab
  groupedItems.forEach((group) => {
    if (selectedTab !== OmnibarTabNames.all && group.tab !== selectedTab) {
      group.items = [];
    }
  });

  const invalidGroups: Set<string> = new Set();

  // If includedGroupKeys is set, only include those groups
  if (includedGroupKeys) {
    // Match on any substring
    // - Used by `insertable-templates-*`
    const isIncluded = (key: string) => {
      for (const prefix of includedGroupKeys) {
        if (key.includes(prefix)) {
          return true;
        }
      }
      return false;
    };
    groupedItems.forEach((group) => {
      if (!isIncluded(group.key)) {
        group.items = [];
        invalidGroups.add(group.key);
      }
    });
  }

  // Empty out groups that match excludedGroupKeys
  if (excludedGroupKeys) {
    groupedItems.forEach((group) => {
      if (excludedGroupKeys.includes(group.key)) {
        group.items = [];
        invalidGroups.add(group.key);
      }
    });
  }
  if (excludedItemKeys) {
    // Make sure we also remove it from recent items
    const excludedItemKeysWithRecent = L.flatMap(excludedItemKeys, (k) => [
      k,
      toRecentKey(k),
    ]);
    groupedItems.forEach((group) => {
      group.items = group.items.filter(
        (i) => !excludedItemKeysWithRecent.includes(i.key)
      );
    });
  }

  // Filter out items that don't match the search query
  if (matcher.hasQuery()) {
    groupedItems.forEach((group) => {
      group.items = group.items.filter((item) => matcher.matches(item.label));
      if (group.items.length === 0) {
        invalidGroups.add(group.key);
      }
    });
  }

  // In-line add drawer needs the ability to filter to target
  if (filterToTarget) {
    let target: TplNode | SlotSelection | null = null;
    if (filterToTarget) {
      const vc = studioCtx.focusedViewCtx();
      if (vc) {
        target = vc.focusedTplOrSlotSelection();
        if (target) {
          for (const group of groupedItems) {
            // In-line insertion --- let's filter down to insertable items
            const addItems = group.items.filter((item) =>
              isAddItem(item)
            ) as AddItem[];
            group.items = await asyncFilter(addItems, async (item) => {
              return await isInsertable(item, vc, target!, insertLoc);
            });
          }
        }
      }
    }
  }

  // Make sure lastUsedItems only contains valid ones
  if (lastUsedItems.length > 0) {
    removeWhere(
      lastUsedItems,
      (x) => !groupedItems.some((group) => group.items.includes(x))
    );
  }

  // Filter out empty groups
  return groupedItems.filter(
    (group) =>
      group.items.length > 0 ||
      (group.showInstall && !invalidGroups.has(group.key))
  );
}

export function createFocusArena(
  site: Site,
  arena: Arena | PageArena | ComponentArena,
  arenaFrame?: ArenaFrame
): CommandItem {
  const arenaName = isKnownArena(arena) ? arena.name : arena.component.name;
  const name = !arenaFrame
    ? arenaName
    : `${arenaName} (${getArenaFrameDesc(arena, arenaFrame, site)})`;
  return {
    type: CommandItemType.focus as const,
    key: `focus-arena-${arena.uid}-${arenaFrame ? arenaFrame.uid : "top"}`,
    label: `Goto ${name}`,
    icon: FRAME_ICON,
    action: async (sc: StudioCtx) => {
      if (arenaFrame) {
        await sc.changeUnsafe(() => {
          sc.switchToArena(arena);
          if (arenaFrame) {
            sc.setStudioFocusOnFrame({
              frame: arenaFrame,
              autoZoom: true,
            });
          }
        });
      }
    },
  };
}
