import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbItemProps,
  BreadcrumbLink,
  BreadcrumbLinkProps,
  BreadcrumbProps,
  BreadcrumbSeparator,
  BreadcrumbSeparatorProps,
} from "@chakra-ui/react";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import {
  getComponentNameAndImportMeta,
  getPlasmicComponentName,
} from "./utils";

export const breadcrumbItemMeta: ComponentMeta<BreadcrumbItemProps> = {
  ...getComponentNameAndImportMeta("BreadcrumbItem", "Breadcrumb"),
  props: {
    isCurrentPage: {
      type: "boolean",
    },
    isLastChild: {
      type: "boolean",
    },
    seperator: {
      type: "string",
      defaultValue: "/",
    },
    spacing: {
      type: "string",
      defaultValue: "8px",
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "component",
          name: getPlasmicComponentName("BreadcrumbLink"),
          props: {
            children: {
              type: "text",
              value: "BreadcrumbItem",
            },
          },
        },
      ],
    },
  },
};

export function registerBreadcrumbItem(
  loader?: Registerable,
  customBreadcrumbItemMeta?: ComponentMeta<BreadcrumbItemProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    BreadcrumbItem,
    customBreadcrumbItemMeta ?? breadcrumbItemMeta
  );
}

export const breadcrumbLinkMeta: ComponentMeta<BreadcrumbLinkProps> = {
  ...getComponentNameAndImportMeta("BreadcrumbLink", "BreadcrumbItem"),
  props: {
    href: {
      type: "string",
      defaultValue: "#",
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Home",
        },
      ],
    },
  },
};

export function registerBreadcrumbLink(
  loader?: Registerable,
  customBreadcrumbLinkMeta?: ComponentMeta<BreadcrumbLinkProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    BreadcrumbLink,
    customBreadcrumbLinkMeta ?? breadcrumbLinkMeta
  );
}

export const breadcrumbMeta: ComponentMeta<BreadcrumbProps> = {
  ...getComponentNameAndImportMeta("Breadcrumb"),
  props: {
    separator: {
      type: "string",
      defaultValue: "/",
    },
    spacing: {
      type: "string",
      defaultValue: "8px",
    },
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "component",
          name: getPlasmicComponentName("BreadcrumbItem"),
          props: {
            children: {
              type: "component",
              name: getPlasmicComponentName("BreadcrumbLink"),
              props: {
                children: {
                  type: "text",
                  value: "Home",
                },
              },
            },
          },
        },
        {
          type: "component",
          name: getPlasmicComponentName("BreadcrumbItem"),
          props: {
            children: {
              type: "component",
              name: getPlasmicComponentName("BreadcrumbLink"),
              props: {
                children: {
                  type: "text",
                  value: "Docs",
                },
              },
            },
          },
        },
        {
          type: "component",
          name: getPlasmicComponentName("BreadcrumbItem"),
          props: {
            isLastChild: true,
            isCurrentPage: true,
            children: {
              type: "component",
              name: getPlasmicComponentName("BreadcrumbLink"),
              props: {
                children: {
                  type: "text",
                  value: "Breadcrumb",
                },
              },
            },
          },
        },
      ],
    },
  },
};

export function registerBreadcrumb(
  loader?: Registerable,
  customBreadcrumbMeta?: ComponentMeta<BreadcrumbProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Breadcrumb, customBreadcrumbMeta ?? breadcrumbMeta);
}

export const breadcrumbSeparatorMeta: ComponentMeta<BreadcrumbSeparatorProps> = {
  ...getComponentNameAndImportMeta("BreadcrumbSeparator", "Breadcrumb"),
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "/",
      },
    },
  },
};

export function registerBreadcrumbSeparator(
  loader?: Registerable,
  customBreadcrumbSeparatorMeta?: ComponentMeta<BreadcrumbSeparatorProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    BreadcrumbSeparator,
    customBreadcrumbSeparatorMeta ?? breadcrumbSeparatorMeta
  );
}
