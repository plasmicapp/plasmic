import registerComponent, {
  ActionProps,
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Button, Input } from "antd";
import {
  default as AntdTabs,
  TabPaneProps,
  TabsProps as AntdTabsProps,
} from "antd/lib/tabs";
import { TabPane } from "rc-tabs";
import React from "react";
import { traverseReactEltTree } from "./customControls";
import { Registerable } from "./registerable";

export const tabPaneMeta: ComponentMeta<TabPaneProps> = {
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
  importPath: "rc-tabs",
  importName: "TabPane",
};

export function registerTabPane(
  loader?: Registerable,
  customTabPaneMeta?: ComponentMeta<TabPaneProps>
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
  const {
    leftTabBarExtraContent,
    rightTabBarExtraContent,
    ...otherProps
  } = props;
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

function AddTab({ studioOps }: ActionProps<any>) {
  const [tabKey, setTabKey] = React.useState<string>("");

  const appendNewTab = (tabKey: string) => {
    if (tabKey !== "") {
      studioOps.appendToChildren({
        type: "component",
        name: "AntdTabPane",
        props: {
          key: tabKey,
        },
      });
    }
  };

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
      <Input
        placeholder="Tab key"
        onChange={(e) => setTabKey(e.target.value)}
        value={tabKey}
      />
      <Button
        onClick={() => {
          appendNewTab(tabKey);
          setTabKey("");
        }}
      >
        Add tab
      </Button>
    </div>
  );
}

export const tabsMeta: ComponentMeta<TabsProps> = {
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
      uncontrolledProp: "defaultActiveKey",
      description: "Initial active TabPane's key",
      options: (props) => {
        const options = new Set<string>();
        traverseReactEltTree(props.children, (elt) => {
          if (elt?.type === TabPane && typeof elt?.key === "string") {
            options.add(elt.key);
          }
        });
        return Array.from(options.keys());
      },
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
          },
        },
        {
          type: "component",
          name: "AntdTabPane",
          props: {
            key: "2",
          },
        },
      ],
    },
  },
  actions: [
    {
      type: "custom-action",
      comp: AddTab,
    },
    {
      type: "button-action",
      label: "Delete current tab",
      onClick: ({ componentProps, studioOps }) => {
        if (componentProps.activeKey) {
          const tabPanes: string[] = [];
          traverseReactEltTree(componentProps.children, (elt) => {
            if (elt?.type === TabPane && typeof elt?.key === "string") {
              tabPanes.push(elt.key);
            }
          });
          const currentTabPos = tabPanes.findIndex((tabKey) => {
            return tabKey === componentProps.activeKey;
          });
          if (currentTabPos !== -1) {
            studioOps.removeChildAt(currentTabPos);
          }
        }
      },
    },
  ],
  importPath: "@plasmicpkgs/antd",
  importName: "Tabs",
};

export function registerTabs(
  loader?: Registerable,
  customTabsMeta?: ComponentMeta<TabsProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Tabs, customTabsMeta ?? tabsMeta);
}
