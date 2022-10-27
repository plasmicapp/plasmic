import {
  TabListProps,
  TabPanelProps,
  TabPanelsProps,
  TabProps,
  TabsProps,
} from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
import {
  getComponentNameAndImportMeta,
  getPlasmicComponentName,
} from "./utils";

export const tabListMeta: ComponentMeta<TabListProps> = {
  ...getComponentNameAndImportMeta("TabList", "Tabs"),
  props: {
    children: {
      type: "slot",
      allowedComponents: [getPlasmicComponentName("Tab")],
    },
  },
};

export const tabsMeta: ComponentMeta<TabsProps> = {
  ...getComponentNameAndImportMeta("Tabs"),
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
      allowedComponents: [
        getPlasmicComponentName("TabList"),
        getPlasmicComponentName("TabPanels"),
      ],
      defaultValue: [
        {
          type: "component",
          name: getPlasmicComponentName("TabList"),
          props: {
            children: [
              {
                type: "component",
                name: getPlasmicComponentName("Tab"),
                props: {
                  children: {
                    type: "text",
                    value: "Tab 1",
                  },
                },
              },
              {
                type: "component",
                name: getPlasmicComponentName("Tab"),
                props: {
                  children: {
                    type: "text",
                    value: "Tab 2",
                  },
                },
              },
              {
                type: "component",
                name: getPlasmicComponentName("Tab"),
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
          name: getPlasmicComponentName("TabPanels"),
          props: {
            children: [
              {
                type: "component",
                name: getPlasmicComponentName("TabPanel"),
                props: {
                  children: {
                    type: "text",
                    value: "Tab 1's Panel Content",
                  },
                },
              },
              {
                type: "component",
                name: getPlasmicComponentName("TabPanel"),
                props: {
                  children: {
                    type: "text",
                    value: "Tab 2's Panel Content",
                  },
                },
              },
              {
                type: "component",
                name: getPlasmicComponentName("TabPanel"),
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

export const tabMeta: ComponentMeta<TabProps> = {
  ...getComponentNameAndImportMeta("Tab", "TabList"),
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

export const tabPanelsMeta: ComponentMeta<TabPanelsProps> = {
  ...getComponentNameAndImportMeta("TabPanels", "Tabs"),
  props: {
    children: {
      type: "slot",
      allowedComponents: [getPlasmicComponentName("TabPanel")],
    },
  },
};

export const tabPanelMeta: ComponentMeta<TabPanelProps> = {
  ...getComponentNameAndImportMeta("TabPanel", "TabPanels"),
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
