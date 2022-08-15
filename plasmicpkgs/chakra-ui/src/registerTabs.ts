import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import {
  TabList,
  TabListProps,
  Tabs,
  TabsProps,
  Tab,
  TabProps,
  TabPanels,
  TabPanelsProps,
  TabPanel,
  TabPanelProps,
} from "@chakra-ui/react";
import { Registerable } from "./registerable";

export const tabListMeta: ComponentMeta<TabListProps> = {
  name: "TabList",
  importPath: "@chakra-ui/react",
  parentComponentName: "Tabs",
  props: {
    children: {
      type: "slot",
      allowedComponents: ["Tab"],
    },
  },
};

export function registerTabList(
  loader?: Registerable,
  customTabListMeta?: ComponentMeta<TabListProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(TabList, customTabListMeta ?? tabListMeta);
}

export const tabsMeta: ComponentMeta<TabsProps> = {
  name: "Tabs",
  importPath: "@chakra-ui/react",
  props: {
    align: {
      type: "choice",
      options: ["start", "center", "end"],
    },
    colorScheme: {
      type: "choice",
      options: [
        "whiteAlpha",
        "blackAlpha",
        "gray",
        "red",
        "orange",
        "yellow",
        "green",
        "teal",
        "blue",
        "cyan",
        "purple",
        "pink",
        "linkedin",
        "facebook",
        "messenger",
        "whatsapp",
        "twitter",
        "telegram",
      ],
    },
    orientation: {
      type: "choice",
      options: ["horizontal", "vertical"],
    },
    size: {
      type: "choice",
      options: ["sm", "md", "lg"],
    },
    variant: {
      type: "choice",
      options: [
        "line",
        "enclosed",
        "enclosed-colored",
        "soft-rounded",
        "solid-rounded",
        "unstyled",
      ],
      defaultValue: "line",
    },
    direction: {
      type: "choice",
      options: ["ltr", "rtl"],
    },
    index: {
      type: "number",
    },
    isFitted: "boolean",
    isLazy: "boolean",
    isManual: "boolean",
    children: {
      type: "slot",
      allowedComponents: ["TabList", "TabPanels"],
      defaultValue: [
        {
          type: "component",
          name: "TabList",
          props: {
            children: [
              {
                type: "component",
                name: "Tab",
                props: {
                  children: {
                    type: "text",
                    value: "Tab 1",
                  },
                },
              },
              {
                type: "component",
                name: "Tab",
                props: {
                  children: {
                    type: "text",
                    value: "Tab 2",
                  },
                },
              },
              {
                type: "component",
                name: "Tab",
                props: {
                  children: {
                    type: "text",
                    value: "Tab 3",
                  },
                },
              },
            ],
          },
        },
        {
          type: "component",
          name: "TabPanels",
          props: {
            children: [
              {
                type: "component",
                name: "TabPanel",
                props: {
                  children: {
                    type: "text",
                    value: "Tab 1's Panel Content",
                  },
                },
              },
              {
                type: "component",
                name: "TabPanel",
                props: {
                  children: {
                    type: "text",
                    value: "Tab 2's Panel Content",
                  },
                },
              },
              {
                type: "component",
                name: "TabPanel",
                props: {
                  children: {
                    type: "text",
                    value: "Tab 3's Panel Content",
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
};

export function registerTabs(
  loader?: Registerable,
  customTabsMeta?: ComponentMeta<TabsProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Tabs, customTabsMeta ?? tabsMeta);
}

export const tabMeta: ComponentMeta<TabProps> = {
  name: "Tab",
  importPath: "@chakra-ui/react",
  parentComponentName: "TabList",
  props: {
    id: "string",
    isDisabled: "boolean",
    panelId: "string",
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Tab",
      },
    },
  },
};

export function registerTab(
  loader?: Registerable,
  customTabMeta?: ComponentMeta<TabProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Tab, customTabMeta ?? tabMeta);
}

export const tabPanelsMeta: ComponentMeta<TabPanelsProps> = {
  name: "TabPanels",
  importPath: "@chakra-ui/react",
  parentComponentName: "Tabs",
  props: {
    children: {
      type: "slot",
      allowedComponents: ["TabPanel"],
    },
  },
};

export function registerTabPanels(
  loader?: Registerable,
  customTabPanelsMeta?: ComponentMeta<TabPanelsProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(TabPanels, customTabPanelsMeta ?? tabPanelsMeta);
}

export const tabPanelMeta: ComponentMeta<TabPanelProps> = {
  name: "TabPanel",
  importPath: "@chakra-ui/react",
  parentComponentName: "TabPanels",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Tab Panel Content",
      },
    },
  },
};

export function registerTabPanel(
  loader?: Registerable,
  customTabPanelMeta?: ComponentMeta<TabPanelProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(TabPanel, customTabPanelMeta ?? tabPanelMeta);
}
