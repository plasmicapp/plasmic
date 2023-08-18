import { Collapse } from "antd";
import React, { ReactNode, useMemo } from "react";
import { Registerable, registerComponentHelper } from "./utils";

export const collapseComponentName = "plasmic-antd5-collapse";
export const collapseItemComponentName = "plasmic-antd5-collapse-item";

type CollapseItemType = NonNullable<
  React.ComponentProps<typeof Collapse>["items"]
>[number];

export const AntdCollapseItem: React.FC<CollapseItemType> = ({ children }) => {
  return <div>{children}</div>;
};

export function AntdCollapse(
  props: Omit<
    React.ComponentProps<typeof Collapse>,
    "items" | "activeKey" | "defaultActiveKeys" | "expandIcon"
  > & {
    items: { props: { children: React.ReactElement<CollapseItemType>[] } };
    defaultActiveKeys?: { key: string | number }[];
    activeKeys?: { key: string | number }[];
    disabled?: boolean;
    expandIcon: React.ReactElement;
    rotateCustomExpandIcon: boolean;
  }
) {
  const {
    items: itemsRaw,
    activeKeys,
    defaultActiveKeys,
    expandIcon,
    collapsible,
    disabled,
    rotateCustomExpandIcon,
    ...rest
  } = props;

  const activeKeyProp = useMemo(() => {
    const res = activeKeys?.map((k) => k.key).filter((k) => k) || [];
    return res.length ? res : undefined;
  }, [activeKeys]);

  const defaultActiveKeysProp = useMemo(() => {
    const res = defaultActiveKeys?.map((k) => k.key).filter((k) => k) || [];
    return res.length ? res : undefined;
  }, [defaultActiveKeys]);

  const items: CollapseItemType[] = useMemo(() => {
    if (!React.isValidElement(itemsRaw)) return [];
    return (
      Array.isArray(itemsRaw.props.children)
        ? itemsRaw.props.children
        : [itemsRaw.props.children]
    )
      .map((currentItem) => {
        if (
          !React.isValidElement(currentItem) ||
          !React.isValidElement(currentItem.props.children)
        ) {
          return null;
        }
        return {
          ...currentItem.props,
          id: currentItem.props.id,
          key: currentItem.props.id,
          children: React.cloneElement(currentItem.props.children),
        };
      })
      .filter((i) => i != null) as CollapseItemType[];
  }, [itemsRaw]);

  return (
    <Collapse
      items={items}
      defaultActiveKey={defaultActiveKeysProp}
      activeKey={activeKeyProp}
      collapsible={disabled ? "disabled" : collapsible}
      expandIcon={
        expandIcon?.key
          ? ({ isActive }) => (
              <div
                style={
                  isActive && rotateCustomExpandIcon
                    ? { transform: "rotate(90deg)" }
                    : undefined
                }
              >
                {expandIcon}
              </div>
            )
          : undefined
      }
      {...rest}
    />
  );
}

export const collapseHelpers = {
  states: {
    activeKeys: {
      onChangeArgsToValue: (activeKeys: string[]) =>
        activeKeys.map((key) => ({ key })),
    },
  },
};

export function registerCollapse(loader?: Registerable) {
  registerComponentHelper(loader, AntdCollapse, {
    name: collapseComponentName,
    displayName: "Collapse",
    defaultStyles: {
      width: "stretch",
    },
    props: {
      accordion: {
        type: "boolean",
        description: `Allow only one panel to be expanded at a time`,
      },
      activeKeys: {
        editOnly: true,
        displayName: "Active Panel IDs",
        uncontrolledProp: "defaultActiveKeys",
        type: "array",
        description: `A list of panel IDs that are expanded by default.`,
        advanced: true,
        itemType: {
          type: "object",
          nameFunc: (_item: any) => `ID: ${_item.key}`,
          fields: {
            key: {
              type: "number",
              displayName: "Panel ID",
            },
          },
        },
      },
      bordered: {
        type: "boolean",
        defaultValue: true,
        description: `Display border around collapse `,
      },
      disabled: {
        type: "boolean",
        description: "Disable the toggle behaviour of panels",
      },
      collapsible: {
        type: "choice",
        defaultValueHint: "header",
        description: `Specify the element that can be clicked to toggle a panel`,
        options: ["header", "icon"],
        hidden: (ps) => Boolean(ps.disabled),
      },
      destroyInactivePanel: {
        type: "boolean",
        advanced: true,
        description: `Destroy/Unmount inactive panels`,
      },
      expandIcon: {
        type: "slot",
        hidePlaceholder: true,
      },
      rotateCustomExpandIcon: {
        type: "boolean",
        description:
          "Enable rotation of custom expand icon when panel is expanded",
        advanced: true,
        hidden: (ps) => !ps.expandIcon?.key,
      },
      expandIconPosition: {
        type: "choice",
        defaultValueHint: "start",
        description: `Set expand icon position`,
        options: ["start", "end"],
      },
      ghost: {
        type: "boolean",
        description: `Make the collapse borderless and its background transparent`,
      },
      size: {
        type: "choice",
        defaultValueHint: "middle",
        description: `Set the size of collapse`,
        options: ["large", "middle", "small"],
      },
      items: {
        type: "slot",
        hidePlaceholder: true,
        allowedComponents: [collapseItemComponentName],
        ...({ mergeWithParent: true } as any),
        defaultValue: [
          {
            type: "component",
            name: collapseItemComponentName,
            props: {
              id: 1,
              label: "First Item",
              children: {
                type: "text",
                value: "First Children",
              },
            },
          },
          {
            type: "component",
            name: collapseItemComponentName,
            props: {
              id: 2,
              label: "Second Item",
              children: {
                type: "text",
                value: "Second Children",
              },
            },
          },
        ],
      },
      onChange: {
        type: "eventHandler",
        argTypes: [{ name: "activeIds", type: "object" }],
      },
    },
    states: {
      activePanelIds: {
        type: "writable",
        valueProp: "activeKeys",
        onChangeProp: "onChange",
        variableType: "array",
        ...collapseHelpers.states.activeKeys,
      },
    },
    componentHelpers: {
      helpers: collapseHelpers,
      importName: "collapseHelpers",
      importPath: "@plasmicpkgs/antd5/skinny/registerCollapse",
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerCollapse",
    importName: "AntdCollapse",
  });

  registerComponentHelper(loader, AntdCollapseItem, {
    name: collapseItemComponentName,
    displayName: "Collapse Item",
    props: {
      id: {
        type: "string",
        description: `Unique identifier for this time`,
      },
      label: {
        type: "string",
        description: `Text inside the header`,
        displayName: "Header Content",
      },
      showArrow: {
        type: "boolean",
        defaultValue: true,
        description: `Whether to show animating arrow alongside header text`,
        advanced: true,
      },
      destroyInactivePanel: {
        type: "boolean",
        description: `Destroy/Unmount panel if inactive`,
        advanced: true,
      },
      forceRender: {
        type: "boolean",
        description: `Force rendering of content in the panel, instead of lazy rendering it.`,
        advanced: true,
      },
      extra: {
        type: "slot",
        hidePlaceholder: true,
      },
      collapsible: {
        type: "boolean",
        advanced: true,
      },
      children: {
        type: "slot",
        hidePlaceholder: true,
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerCollapse",
    importName: "AntdCollapseItem",
    parentComponentName: collapseComponentName,
  });
}
