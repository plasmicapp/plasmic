import {
  BreadcrumbItemProps,
  BreadcrumbLinkProps,
  BreadcrumbProps,
  BreadcrumbSeparatorProps,
} from "@chakra-ui/react";
import { type CodeComponentMeta } from "@plasmicapp/host/registerComponent";
import {
  getComponentNameAndImportMeta,
  getPlasmicComponentName,
} from "./utils";

export const breadcrumbItemMeta: CodeComponentMeta<BreadcrumbItemProps> = {
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

export const breadcrumbLinkMeta: CodeComponentMeta<BreadcrumbLinkProps> = {
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

export const breadcrumbMeta: CodeComponentMeta<BreadcrumbProps> = {
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

export const breadcrumbSeparatorMeta: CodeComponentMeta<BreadcrumbSeparatorProps> =
  {
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
