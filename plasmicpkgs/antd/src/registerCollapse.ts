import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { CollapsePanelProps, CollapseProps } from "antd";
import Collapse from "antd/lib/collapse/Collapse";
import CollapsePanel from "antd/lib/collapse/CollapsePanel";
import { traverseReactEltTree } from "./customControls";
import { Registerable } from "./registerable";

export const collapstePanelMeta: ComponentMeta<CollapsePanelProps> = {
  name: "AntdCollapsePanel",
  displayName: "Antd Collapse Panel",
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
  importPath: "antd/lib/collapse/CollapsePanel",
  importName: "CollapsePanel",
  isDefaultExport: true,
};

export function registerCollapsePanel(
  loader?: Registerable,
  customCollapsePanelMeta?: ComponentMeta<CollapsePanelProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    CollapsePanel,
    customCollapsePanelMeta ?? collapstePanelMeta
  );
}

export const collapsteMeta: ComponentMeta<CollapseProps> = {
  name: "AntdCollapse",
  displayName: "Antd Collapse",
  props: {
    accordion: {
      type: "boolean",
      description: "If true, Collapse renders as Accordion",
    },
    activeKey: {
      type: "choice",
      editOnly: true,
      uncontrolledProp: "defaultActiveKey",
      description: "Key of the active panel",
      multiSelect: true,
      options: (componentProps) => {
        const options = new Set<string>();
        // `children` is not defined in the Collapse props
        traverseReactEltTree((componentProps as any).children, (elt) => {
          if (elt?.type === CollapsePanel && typeof elt?.key === "string") {
            options.add(elt.key);
          }
        });
        return Array.from(options.keys());
      },
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
      allowedComponents: ["AntdCollapsePanel"],
      defaultValue: [
        {
          type: "component",
          name: "AntdCollapsePanel",
        },
      ],
    },
  },
  importPath: "antd/lib/collapse/Collapse",
  importName: "Collapse",
  isDefaultExport: true,
};

export function registerCollapse(
  loader?: Registerable,
  customCollapseMeta?: ComponentMeta<CollapseProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Collapse, customCollapseMeta ?? collapsteMeta);
}
