import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import type {
  CollapsePanelProps,
  CollapseProps as AntdCollapseProps,
} from "antd/es/collapse";
import { Collapse as AntdCollapse } from "antd";
import React from "react";
import { traverseReactEltTree } from "./customControls";
import { Registerable } from "./registerable";
export const CollapsePanel = AntdCollapse.Panel;

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
      defaultValueHint: false,
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
      defaultValueHint: true,
    },
    extra: {
      type: "slot",
      hidePlaceholder: true,
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
  importPath: "@plasmicpkgs/antd/skinny/registerCollapse",
  importName: "CollapsePanel",
  parentComponentName: "AntdCollapse",
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

type CollapseProps = {
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
} & AntdCollapseProps;

function getOptions(componentProps: CollapseProps) {
  const options = new Set<string>();
  // `children` is not defined in the Collapse props
  traverseReactEltTree((componentProps as any).children, (elt) => {
    if (elt?.type === CollapsePanel && typeof elt?.key === "string") {
      options.add(elt.key);
    }
  });
  return Array.from(options.keys());
}

export const collapsteMeta: ComponentMeta<CollapseProps> = {
  name: "AntdCollapse",
  displayName: "Antd Collapse",
  props: {
    accordion: {
      type: "boolean",
      description: "If true, Collapse renders as Accordion",
      defaultValueHint: false,
    },
    activeKey: {
      type: "choice",
      editOnly: true,
      description: "Key of the active panel",
      multiSelect: true,
      options: getOptions,
    },
    onChange: {
      type: "eventHandler",
      argTypes: [
        {
          name: "value",
          type: {
            type: "choice",
            multiSelect: true,
            options: getOptions,
          },
        },
      ],
    },
    bordered: {
      type: "boolean",
      description: "Toggles rendering of the border around the collapse block",
      defaultValueHint: true,
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
      defaultValueHint: "left",
    },
    ghost: {
      type: "boolean",
      description:
        "Make the collapse borderless and its background transparent",
      defaultValueHint: false,
    },
    children: {
      type: "slot",
      allowedComponents: ["AntdCollapsePanel"],
      defaultValue: [
        {
          type: "component",
          name: "AntdCollapsePanel",
          props: {
            key: "1",
          },
        },
      ],
    },
    openIcon: {
      type: "slot",
      hidePlaceholder: true,
    },
    closeIcon: {
      type: "slot",
      hidePlaceholder: true,
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
  importPath: "@plasmicpkgs/antd/skinny/registerCollapse",
  importName: "Collapse",
};

export function Collapse(props: CollapseProps) {
  const { openIcon, closeIcon, ...rest } = props;
  return (
    <AntdCollapse
      {...rest}
      expandIcon={
        openIcon || closeIcon
          ? ({ isActive }) => (isActive ? openIcon : closeIcon)
          : undefined
      }
    />
  );
}

export function registerCollapse(
  loader?: Registerable,
  customCollapseMeta?: ComponentMeta<CollapseProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Collapse, customCollapseMeta ?? collapsteMeta);
}
