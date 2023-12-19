import { Breadcrumb, BreadcrumbItemProps, BreadcrumbProps } from "antd/lib";
import React from "react";
import { Registerable, registerComponentHelper } from "./utils";

export function AntdBreadcrumbItem(props: BreadcrumbItemProps) {
  return props.children;
}

export function AntdBreadcrumb(
  props: BreadcrumbProps & { itemsRaw: React.ReactNode }
) {
  const itemsRaw = props.itemsRaw;
  const items = React.useMemo(() => {
    if (!React.isValidElement(itemsRaw) && !Array.isArray(itemsRaw)) return [];
    return (
      Array.isArray(itemsRaw)
        ? itemsRaw
        : Array.isArray(itemsRaw.props.children)
        ? itemsRaw.props.children
        : [itemsRaw.props.children]
    )
      .map((currentItem: any) => {
        return {
          ...currentItem.props,
          title: React.cloneElement(<>{currentItem}</>),
        };
      })
      .filter((i: any) => i != null);
  }, [itemsRaw]);

  return <Breadcrumb {...props} items={items} />;
}

const breadcrumbItemComponentName = "plasmic-antd5-breadcrumb-item";
const breadcrumbComponentName = "plasmic-antd5-breadcrumb";

export function registerBreadcrumb(loader?: Registerable) {
  registerComponentHelper(loader, AntdBreadcrumb, {
    name: breadcrumbComponentName,
    displayName: "Breadcrumb",
    props: {
      itemsRaw: {
        type: "slot",
        displayName: "items",
        defaultValue: [
          {
            type: "component",
            name: breadcrumbItemComponentName,
            props: {
              children: {
                type: "text",
                value: "First",
              },
            },
          },
          {
            type: "component",
            name: breadcrumbItemComponentName,
            props: {
              children: {
                type: "text",
                value: "Second",
              },
            },
          },
          {
            type: "component",
            name: breadcrumbItemComponentName,
            props: {
              children: {
                type: "text",
                value: "Third",
              },
            },
          },
        ],
        allowedComponents: [breadcrumbItemComponentName],
      },
      separator: {
        type: "slot",
        defaultValue: {
          type: "text",
          value: "/",
        },
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerBreadcrumb",
    importName: "AntdBreadcrumb",
  });
}

export function registerBreadcrumbItem(loader?: Registerable) {
  registerComponentHelper(loader, AntdBreadcrumbItem, {
    name: breadcrumbItemComponentName,
    displayName: "Breadcrumb Item",
    props: {
      children: {
        type: "slot",
        defaultValue: {
          type: "text",
          value: "Breadcrumb Item",
        },
      },
      onClick: {
        type: "eventHandler",
        argTypes: [{ type: "object", name: "event" }],
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerBreadcrumb",
    importName: "AntdBreadcrumbItem",
  });
}
