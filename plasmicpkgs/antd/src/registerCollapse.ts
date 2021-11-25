import { ComponentMeta } from "@plasmicapp/host";
import registerComponent from "@plasmicapp/host/registerComponent";
import { Collapse, CollapseProps, CollapsePanelProps } from "antd";
import { Registerable } from "./registerable";

const { Panel } = Collapse;

export const collapstePanelMeta: ComponentMeta<CollapsePanelProps> = {
  name: "Antd Collapse Panel",
  props: {
    collapsible: {
      type: "choice",
      options: ["header", "disabled"],
      description:
        "Specify whether the panel be collapsible or the trigger area of collapsible",
    },
    forceRender: {
      type: "boolean",
      description:
        "Forced render of content on panel, instead of lazy rending after clicking on header",
    },
    header: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Header",
        },
      ],
    },
    key: {
      type: "string",
      description: "Unique key identifying the panel from among its siblings",
    },
    showArrow: {
      type: "boolean",
      description: "If false, panel will not show arrow icon",
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Insert text here",
        },
      ],
    },
  },
  importPath: "antd",
  importName: "Panel",
};

export function registerCollapsePanel(
  loader?: Registerable,
  customCollapsePanelMeta?: ComponentMeta<CollapsePanelProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Panel, customCollapsePanelMeta ?? collapstePanelMeta);
}

export const collapsteMeta: ComponentMeta<CollapseProps> = {
  name: "Antd Collapse",
  props: {
    accordion: {
      type: "boolean",
      description: "If true, Collapse renders as Accordion",
    },
    activeKey: {
      type: "object",
      editOnly: true,
      uncontrolledProp: "defaultActiveKey",
      description: "Key of the active panel",
    },
    bordered: {
      type: "boolean",
      description: "Toggles rendering of the border around the collapse block",
    },
    collapsible: {
      type: "choice",
      options: ["header", "disabled"],
      description:
        "Specify whether the panels of children be collapsible or the trigger area of collapsible",
    },
    expandIconPosition: {
      type: "choice",
      options: ["left", "right"],
      description: "Set expand icon position",
    },
    ghost: {
      type: "boolean",
      description:
        "Make the collapse borderless and its background transparent",
    },
    children: {
      type: "slot",
      allowedComponents: ["Antd Collapse Panel"],
      defaultValue: [
        {
          type: "component",
          name: "Antd Collapse Panel",
        },
      ],
    },
  },
  importPath: "antd",
  importName: "Collapse",
};

export function registerCollapse(
  loader?: Registerable,
  customCollapseMeta?: ComponentMeta<CollapseProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Collapse, customCollapseMeta ?? collapsteMeta);
}
