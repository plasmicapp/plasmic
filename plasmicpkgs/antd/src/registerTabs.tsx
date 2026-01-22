import registerComponent, {
  ActionProps,
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Tabs as AntdTabs, Button } from "antd";
import type { TabsProps as AntdTabsProps, TabPaneProps } from "antd/es/tabs";
import React from "react";
import { traverseReactEltTree } from "./customControls";
import { Registerable } from "./registerable";

export const TabPane = AntdTabs.TabPane;

export const tabPaneMeta: CodeComponentMeta<TabPaneProps> = {
  name: "AntdTabPane",
  displayName: "Antd Tab Pane",
  props: {
    tab: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Tab",
        },
      ],
    },
    key: {
      type: "string",
      description: "Unique TabPane's key",
      defaultValue: "tabPaneKey",
    },
    closable: {
      type: "boolean",
      description:
        "Wether the tab can be closed or not. Only works for editable tabs",
      defaultValueHint: true,
    },
    disabled: {
      type: "boolean",
      description: "Disabled state of tab",
      defaultValueHint: false,
    },
    forceRender: {
      type: "boolean",
      description:
        "Forced render of content in tabs, not lazy render after clicking on tabs",
      defaultValueHint: false,
    },
    closeIcon: {
      type: "slot",
      hidePlaceholder: true,
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Tab Content",
        },
      ],
    },
  },
  parentComponentName: "AntdTabs",
  importPath: "@plasmicpkgs/antd/skinny/registerTabs",
  importName: "TabPane",
};

export function registerTabPane(
  loader?: Registerable,
  customTabPaneMeta?: CodeComponentMeta<TabPaneProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(TabPane, customTabPaneMeta ?? tabPaneMeta);
}

export type TabsProps = Omit<AntdTabsProps, "tabBarExtraContent"> & {
  leftTabBarExtraContent?: React.ReactNode;
  rightTabBarExtraContent?: React.ReactNode;
};

export function Tabs(props: TabsProps) {
  const { leftTabBarExtraContent, rightTabBarExtraContent, ...otherProps } =
    props;
  return (
    <AntdTabs
      {...otherProps}
      tabBarExtraContent={{
        left: leftTabBarExtraContent,
        right: rightTabBarExtraContent,
      }}
    />
  );
}

function NavigateTabs({ componentProps, studioOps }: ActionProps<any>) {
  const tabPanes: string[] = [];
  traverseReactEltTree(componentProps.children, (elt) => {
    if (elt?.type === TabPane && typeof elt?.key === "string") {
      tabPanes.push(elt.key);
    }
  });

  const activeKey = componentProps.activeKey;
  const currTabPos = activeKey
    ? tabPanes.findIndex((tabKey) => {
        return tabKey === activeKey;
      })
    : 0;

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "row",
        gap: "10px",
        justifyContent: "space-between",
      }}
    >
      <Button
        style={{ width: "100%" }}
        onClick={() => {
          if (tabPanes.length > 0) {
            const prevTabPos =
              (currTabPos - 1 + tabPanes.length) % tabPanes.length;
            studioOps.updateProps({ activeKey: tabPanes[prevTabPos] });
          }
        }}
      >
        Prev tab
      </Button>
      <Button
        style={{ width: "100%" }}
        onClick={() => {
          if (tabPanes.length > 0) {
            const nextTabPos = (currTabPos + 1) % tabPanes.length;
            studioOps.updateProps({ activeKey: tabPanes[nextTabPos] });
          }
        }}
      >
        Next tab
      </Button>
    </div>
  );
}

function OutlineMessage() {
  return <div>* To re-arrange tab panes, use the Outline panel</div>;
}

function getActiveKeyOptions(props: TabsProps) {
  const options = new Set<string>();
  traverseReactEltTree(props.children, (elt) => {
    if (elt?.type === TabPane && typeof elt?.key === "string") {
      options.add(elt.key);
    }
  });
  return Array.from(options.keys());
}

export const tabsMeta: CodeComponentMeta<TabsProps> = {
  name: "AntdTabs",
  displayName: "Antd Tabs",
  props: {
    type: {
      type: "choice",
      options: ["line", "card", "editable-card"],
      defaultValueHint: "line",
      description: "Basic style of tabs",
    },
    addIcon: {
      type: "slot",
      hidePlaceholder: true,
    },
    animated: {
      type: "object",
      hidden: (props) => props.tabPosition !== "top" && !!props.tabPosition,
      defaultValueHint: { inkBar: true, tabPane: false },
      description:
        "Whether to change tabs with animation. Can be either a boolean or specify for inkBar and tabPane",
    },
    hideAdd: {
      type: "boolean",
      hidden: (props) => props.type !== "editable-card",
      defaultValueHint: false,
      description: "Hide plus icon or not",
    },
    moreIcon: {
      type: "slot",
      hidePlaceholder: true,
    },
    size: {
      type: "choice",
      options: ["large", "default", "small"],
      defaultValueHint: "default",
      description: "Preset tab bar size",
    },
    tabPosition: {
      type: "choice",
      options: ["top", "right", "bottom", "left"],
      defaultValueHint: "top",
      description: "Position of tabs",
    },
    tabBarGutter: {
      type: "number",
      description: "The gap between tabs",
    },
    centered: {
      type: "boolean",
      description: "Centers tabs",
      defaultValueHint: false,
    },
    leftTabBarExtraContent: {
      type: "slot",
      hidePlaceholder: true,
    },
    rightTabBarExtraContent: {
      type: "slot",
      hidePlaceholder: true,
    },
    tabBarStyle: {
      type: "object",
      description: "CSS for the Tab Bar style",
    },
    activeKey: {
      type: "choice",
      editOnly: true,
      description: "Initial active TabPane's key",
      options: getActiveKeyOptions,
    },
    onChange: {
      type: "eventHandler",
      argTypes: [
        {
          name: "activeKey",
          type: {
            type: "choice",
            options: getActiveKeyOptions,
          },
        },
      ],
    },
    children: {
      type: "slot",
      allowedComponents: ["AntdTabPane"],
      defaultValue: [
        {
          type: "component",
          name: "AntdTabPane",
          props: {
            key: "1",
            tab: [
              {
                type: "text",
                value: "Tab",
              },
            ],
            children: [
              {
                type: "text",
                value: "Tab content",
              },
            ],
          },
        },
        {
          type: "component",
          name: "AntdTabPane",
          props: {
            key: "2",
            tab: [
              {
                type: "text",
                value: "Tab",
              },
            ],
            children: [
              {
                type: "text",
                value: "Tab content",
              },
            ],
          },
        },
      ],
    },
  },
  states: {
    activeKey: {
      type: "writable",
      variableType: "array",
      valueProp: "activeKey",
      onChangeProp: "onChange",
    },
  },
  actions: [
    {
      type: "custom-action",
      control: NavigateTabs,
    },
    {
      type: "button-action",
      label: "Add new tab",
      onClick: ({ componentProps, studioOps }: ActionProps<any>) => {
        // Get the first positive integer that isn't already a key
        const generateNewKey = () => {
          const keysSet = new Set<string>();
          traverseReactEltTree(componentProps.children, (elt) => {
            if (elt?.type === TabPane && typeof elt?.key === "string") {
              keysSet.add(elt.key);
            }
          });

          for (
            let keyCandidate = 1;
            keyCandidate <= keysSet.size + 1;
            keyCandidate++
          ) {
            const strKey = keyCandidate.toString();
            if (!keysSet.has(strKey)) {
              return strKey;
            }
          }

          return undefined;
        };

        const tabKey = generateNewKey();
        studioOps.appendToSlot(
          {
            type: "component",
            name: "AntdTabPane",
            props: {
              key: tabKey,
            },
          },
          "children"
        );
        studioOps.updateProps({ activeKey: tabKey });
      },
    },
    {
      type: "button-action",
      label: "Delete current tab",
      onClick: ({ componentProps, studioOps }: ActionProps<any>) => {
        if (componentProps.activeKey) {
          const tabPanes: string[] = [];
          traverseReactEltTree(componentProps.children, (elt) => {
            if (elt?.type === TabPane && typeof elt?.key === "string") {
              tabPanes.push(elt.key);
            }
          });

          const activeKey = componentProps.activeKey;
          const currTabPos = tabPanes.findIndex((tabKey) => {
            return tabKey === activeKey;
          });

          if (currTabPos !== -1) {
            studioOps.removeFromSlotAt(currTabPos, "children");
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
  importPath: "@plasmicpkgs/antd/skinny/registerTabs",
  importName: "Tabs",
};

export function registerTabs(
  loader?: Registerable,
  customTabsMeta?: CodeComponentMeta<TabsProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Tabs, customTabsMeta ?? tabsMeta);
}
