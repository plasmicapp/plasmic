import {
  BreadcrumbItemProps,
  BreadcrumbLinkProps,
  BreadcrumbProps,
  BreadcrumbSeparatorProps,
} from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
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
