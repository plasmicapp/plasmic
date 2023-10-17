import { ActionProps } from "@plasmicapp/host/registerComponent";
import { Tabs } from "antd";
import React, { ReactElement, useMemo } from "react";
import {
  Registerable,
  registerComponentHelper,
  traverseReactEltTree,
} from "./utils";

export const tabsComponentName = "plasmic-antd5-tabs";
export const tabItemComponentName = "plasmic-antd5-tab-item";

type TabItemType = NonNullable<
  React.ComponentProps<typeof Tabs>["items"]
>[number];

export const AntdTabItem: React.FC<TabItemType> = ({ children }) => {
  return <div>{children}</div>;
};

function getTabItems(items: ReactElement): React.ReactElement<TabItemType>[] {
  return (items?.type as any)?.name == AntdTabItem.name
    ? [items]
    : items?.props.children;
}

function getTabItemKeys(items: ReactElement): string[] {
  const keys: string[] = [];
  traverseReactEltTree(items, (elt) => {
    if (
      (elt?.type as any)?.name === AntdTabItem.name &&
      typeof elt?.key === "string"
    ) {
      keys.push(`${elt.key}`);
    }
  });
  return keys;
}

type TabsProps = Omit<
  React.ComponentProps<typeof Tabs>,
  "items" | "animated" | "tabBarExtraContent" | "renderTabBar"
> & {
  items: ReactElement;
  animated: boolean;
  animateTabBar: boolean;
  animateTabContent: boolean;
  tabBarExtraContentLeft: React.ReactNode;
  tabBarExtraContentRight: React.ReactNode;
  sticky: boolean;
  stickyOffset: number;
  tabBarBackground: string;
  tabsScopeClassName?: string;
  tabsDropdownScopeClassName?: string;
};

export function AntdTabs(props: TabsProps) {
  const {
    items: itemsRaw,
    animated,
    animateTabBar,
    animateTabContent,
    tabBarExtraContentLeft,
    tabBarExtraContentRight,
    sticky,
    stickyOffset,
    tabBarBackground,
    className,
    tabPosition,
    tabsScopeClassName,
    tabsDropdownScopeClassName,
    ...rest
  } = props;
  const animationProp: React.ComponentProps<typeof Tabs>["animated"] = useMemo(
    () =>
      animated
        ? {
            inkBar: animateTabBar,
            tabPane: animateTabContent,
          }
        : false,
    [animateTabBar, animateTabContent, animated]
  );
  const items: TabItemType[] = useMemo(() => {
    if (!React.isValidElement(itemsRaw)) return [];
    const tabItems = getTabItems(itemsRaw);
    return tabItems
      .map((currentItem) => {
        return {
          ...currentItem.props,
          key: currentItem.key,
          children: <>{currentItem.props.children}</>,
        };
      })
      .filter((i) => i != null) as TabItemType[];
  }, [itemsRaw]);

  return (
    <Tabs
      className={`${className} ${tabsScopeClassName}`}
      popupClassName={tabsDropdownScopeClassName}
      tabBarExtraContent={{
        left: <>{tabBarExtraContentLeft}</>,
        right: <>{tabBarExtraContentRight}</>,
      }}
      tabPosition={tabPosition}
      /**
       * CAUTION: sticky tab-bars are only supported for tabPosition top.
       * In component metadata, I have specified that sticky prop is hidden when tabPosition !== "top".
       * however, and that's where the caution is, that does not mean that any previously set value of sticky is destroyed. It stays there, but just the prop is hidden from the Settings side menu in Plasmic Studio.
       *
       * Which is why I have to also check the tabPosition here. And that's redundant.
       */
      renderTabBar={
        sticky && tabPosition === "top"
          ? (tabBarProps, DefaultTabBar) => (
              <div
                style={{
                  zIndex: 1,
                  position: "sticky",
                  top: stickyOffset || 0,
                }}
              >
                <DefaultTabBar
                  {...tabBarProps}
                  style={{ backgroundColor: tabBarBackground }}
                />
              </div>
            )
          : undefined
      }
      animated={animationProp}
      items={items}
      {...rest}
    />
  );
}

// function NavigateTabs({ componentProps, studioOps }: ActionProps<any>) {
//   const tabPanes: string[] = getTabItemKeys(componentProps.items);
//   const buttonStyle = {
//     width: "100%",
//     borderColor: "#f3f3f2",
//     borderRadius: 6,
//     fontSize: 12,
//   };
//   const activeKey = componentProps.activeKey;
//   const currTabPos = activeKey
//     ? tabPanes.findIndex((tabKey) => {
//         return tabKey === activeKey;
//       })
//     : 0;

//   return (
//     <div
//       style={{
//         width: "100%",
//         display: "flex",
//         flexDirection: "row",
//         gap: "4px",
//         justifyContent: "space-between",
//       }}
//     >
//       <Button
//         style={buttonStyle}
//         onClick={() => {
//           if (tabPanes.length > 0) {
//             const prevTabPos =
//               (currTabPos - 1 + tabPanes.length) % tabPanes.length;
//             studioOps.updateProps({ activeKey: tabPanes[prevTabPos] });
//           }
//         }}
//       >
//         Prev tab
//       </Button>
//       <Button
//         style={buttonStyle}
//         onClick={() => {
//           if (tabPanes.length > 0) {
//             const nextTabPos = (currTabPos + 1) % tabPanes.length;
//             studioOps.updateProps({ activeKey: tabPanes[nextTabPos] });
//           }
//         }}
//       >
//         Next tab
//       </Button>
//     </div>
//   );
// }

function OutlineMessage() {
  return <div>* To re-arrange tab panes, use the Outline panel</div>;
}

export function registerTabs(loader?: Registerable) {
  registerComponentHelper(loader, AntdTabs, {
    name: tabsComponentName,
    displayName: "Tabs",
    defaultStyles: {
      width: "stretch",
      overflow: "scroll",
    },
    props: {
      activeKey: {
        editOnly: true,
        displayName: "Active tab key",
        uncontrolledProp: "defaultActiveKey",
        type: "choice",
        description: `Initial active tab's key`,
        options: (ps) => getTabItemKeys(ps.items),
      },
      animated: {
        type: "boolean",
        defaultValue: true,
        description: "Change tabs with animation",
      },
      animateTabBar: {
        type: "boolean",
        defaultValue: true,
        description: "Animate the tab bar when switching tabs",
        hidden: (ps) => !ps.animated,
      },
      animateTabContent: {
        type: "boolean",
        defaultValue: false,
        description: "Fade-in tab content when switching tabs",
        hidden: (ps) => !ps.animated,
      },
      centered: {
        type: "boolean",
        description: "Center-align the tab bar",
      },
      type: {
        type: "choice",
        defaultValueHint: "line",
        options: ["line", "card"],
        description: "Basic style of tabs",
      },
      items: {
        type: "slot",
        hidePlaceholder: true,
        allowedComponents: [tabItemComponentName],
        ...({ mergeWithParent: true } as any), // to make the tab items selectable from the components outline pane in Plasmic Studio.
        defaultValue: [
          {
            type: "component",
            name: tabItemComponentName,
            props: {
              key: "1",
              label: {
                type: "text",
                value: "First Item",
              },
              children: {
                type: "text",
                value: "First Children",
              },
            },
          },
          {
            type: "component",
            name: tabItemComponentName,
            props: {
              key: "2",
              label: {
                type: "text",
                value: "Second Item",
              },
              children: {
                type: "text",
                value: "Second Children",
              },
            },
          },
        ],
      },
      size: {
        type: "choice",
        defaultValueHint: "middle",
        options: ["large", "middle", "small"],
        description: "Preset tab bar size",
      },
      tabBarExtraContentLeft: {
        type: "slot",
        displayName: "Extra content on left side",
        hidePlaceholder: true,
      },
      tabBarExtraContentRight: {
        type: "slot",
        displayName: "Extra content on right side",
        hidePlaceholder: true,
      },
      tabBarGutter: {
        type: "number",
        displayName: "Tab gap",
        description: "Gap (in pixels) between tabs",
        advanced: true,
      },
      tabPosition: {
        type: "choice",
        defaultValueHint: "top",
        options: ["top", "right", "bottom", "left"],
        description: "Position of tabs",
      },
      destroyInactiveTabPane: {
        type: "boolean",
        description: `Destroy/Unmount inactive tab pane when changing tab`,
        advanced: true,
      },
      sticky: {
        type: "boolean",
        advanced: true,
        description: "Stick tab bar to the top of the page when scrolling.",
        defaultValue: false,
        hidden: (ps) => ps.tabPosition !== "top",
      },
      stickyOffset: {
        type: "number",
        advanced: true,
        description:
          "Distance (in pixels) between the sticky tab bar and the top of the page as you scroll.",
        hidden: (ps) => ps.tabPosition !== "top" || !ps.sticky,
      },
      tabBarBackground: {
        type: "color",
        advanced: true,
        defaultValue: "#FFF",
        hidden: (ps) => ps.tabPosition !== "top" || !ps.sticky,
      },
      tabsScopeClassName: {
        type: "styleScopeClass",
        scopeName: "tabs",
      } as any,
      tabBarClassName: {
        type: "class",
        displayName: "Tab bar",
        selectors: [
          {
            selector: ":tabs.ant-tabs .ant-tabs-nav",
            label: "Base",
          },
        ],
      },
      tabsDropdownScopeClassName: {
        type: "styleScopeClass",
        scopeName: "tabsDropdown",
      } as any,
      tabsDropdownClassName: {
        type: "class",
        displayName: "Overflow tabs menu",
        selectors: [
          {
            selector: ":tabsDropdown.ant-tabs-dropdown .ant-tabs-dropdown-menu",
            label: "Base",
          },
        ],
      },
      onChange: {
        type: "eventHandler",
        advanced: true,
        argTypes: [{ name: "activeKey", type: "string" }],
      },
      onTabClick: {
        type: "eventHandler",
        advanced: true,
        argTypes: [
          { name: "tabKey", type: "string" },
          { name: "mouseEvent", type: "object" },
        ],
      },
      onTabScroll: {
        type: "eventHandler",
        advanced: true,
        argTypes: [{ name: "scrollInfo", type: "object" }],
      },
    },
    states: {
      activeKey: {
        type: "writable",
        valueProp: "activeKey",
        onChangeProp: "onChange",
        variableType: "text",
      },
    },
    actions: [
      // {
      //   type: "custom-action",
      //   control: NavigateTabs,
      // },
      {
        type: "button-action",
        label: "Add new tab",
        onClick: ({ componentProps, studioOps }: ActionProps<any>) => {
          // Get the first positive integer that isn't already a key
          const generateNewKey = () => {
            const existingKeys = getTabItemKeys(componentProps.items);

            for (
              let keyCandidate = 1;
              keyCandidate <= existingKeys.length + 1;
              keyCandidate++
            ) {
              const strKey = keyCandidate.toString();
              const index = existingKeys.findIndex((k) => {
                return strKey === k;
              });
              if (index === -1) {
                return strKey;
              }
            }

            return undefined;
          };

          const tabKey = generateNewKey();
          studioOps.appendToSlot(
            {
              type: "component",
              name: tabItemComponentName,
              props: {
                key: tabKey,
                label: {
                  type: "text",
                  value: `Tab Label ${tabKey}`,
                },
                children: {
                  type: "text",
                  value: `Tab Children ${tabKey}`,
                },
              },
            },
            "items"
          );
          studioOps.updateProps({ activeKey: tabKey });
        },
      },
      {
        type: "button-action",
        label: "Delete current tab",
        onClick: ({ componentProps, studioOps }: ActionProps<any>) => {
          if (componentProps.activeKey) {
            const tabPanes = getTabItemKeys(componentProps.items);
            const activeKey = componentProps.activeKey;
            const currTabPos = tabPanes.findIndex((tabKey) => {
              return tabKey === activeKey;
            });

            if (currTabPos !== -1) {
              studioOps.removeFromSlotAt(currTabPos, "items");
              if (tabPanes.length - 1 > 0) {
                const prevTabPos =
                  (currTabPos - 1 + tabPanes.length) % tabPanes.length;
                studioOps.updateProps({ activeKey: tabPanes[prevTabPos] });
              }
            }
          }
        },
      },
      {
        type: "custom-action",
        control: OutlineMessage,
      },
    ],
    importPath: "@plasmicpkgs/antd5/skinny/registerTabs",
    importName: "AntdTabs",
  });

  registerComponentHelper(loader, AntdTabItem, {
    name: tabItemComponentName,
    displayName: "Tab Item",
    props: {
      disabled: {
        type: "boolean",
        description: "Disable this tab",
      },
      forceRender: {
        type: "boolean",
        description: `Force render of content in the tab, not lazy render after clicking on the tab`,
        advanced: true,
      },
      key: {
        type: "string",
        description: `Unique identifier for this tab`,
        displayName: "Tab key",
      },
      label: {
        type: "slot",
        displayName: "Tab title",
        defaultValue: "Tab",
      },
      children: {
        type: "slot",
        hidePlaceholder: true,
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerTabs",
    importName: "AntdTabItem",
    parentComponentName: tabsComponentName,
  });
}
