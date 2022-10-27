import {
  TableBodyProps,
  TableCaptionProps,
  TableCellProps,
  TableColumnHeaderProps,
  TableContainerProps,
  TableFooterProps,
  TableHeadProps,
  TableProps,
  TableRowProps,
} from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
import {
  getComponentNameAndImportMeta,
  getPlasmicComponentName,
} from "./utils";

export const tableMeta: ComponentMeta<TableProps> = {
  ...getComponentNameAndImportMeta("Table", "TableContainer"),
  props: {
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
      defaultValue: "gray",
    },
    size: {
      type: "choice",
      options: ["sm", "md", "lg"],
      defaultValue: "md",
    },
    variant: {
      type: "choice",
      options: ["simple", "striped", "unstyled"],
      defaultValue: "simple",
    },
    children: {
      type: "slot",
    },
  },
};

export const tableCaptionMeta: ComponentMeta<TableCaptionProps> = {
  ...getComponentNameAndImportMeta("TableCaption", "Table"),
  props: {
    placement: {
      type: "choice",
      options: ["top", "bottom"],
      defaultValue: "bottom",
    },
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Imperial to metric conversion factors",
      },
    },
  },
};

export const theadMeta: ComponentMeta<TableHeadProps> = {
  ...getComponentNameAndImportMeta("Thead", "Table"),
  props: {
    children: {
      type: "slot",
      allowedComponents: [
        getPlasmicComponentName("Th"),
        getPlasmicComponentName("Tr"),
      ],
    },
  },
};

export const tbodyMeta: ComponentMeta<TableBodyProps> = {
  ...getComponentNameAndImportMeta("Tbody", "Table"),
  props: {
    children: {
      type: "slot",
      allowedComponents: [
        getPlasmicComponentName("Td"),
        getPlasmicComponentName("Tr"),
      ],
    },
  },
};

export const trMeta: ComponentMeta<TableRowProps> = {
  ...getComponentNameAndImportMeta("Tr", "Table"),
  props: {
    children: {
      type: "slot",
      allowedComponents: [
        getPlasmicComponentName("Td"),
        getPlasmicComponentName("Th"),
      ],
    },
  },
};

export const tdMeta: ComponentMeta<TableCellProps> = {
  ...getComponentNameAndImportMeta("Td", "Tr"),
  props: {
    isNumeric: "boolean",
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Table Cell",
      },
    },
  },
};

export const thMeta: ComponentMeta<TableColumnHeaderProps> = {
  ...getComponentNameAndImportMeta("Th", "Tr"),
  props: {
    isNumeric: "boolean",
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Table Cell",
      },
    },
  },
};

export const tableContainerMeta: ComponentMeta<TableContainerProps> = {
  ...getComponentNameAndImportMeta("TableContainer"),
  props: {
    overflowX: {
      type: "choice",
      options: ["auto", "scroll", "hidden", "visible"],
    },
    overflowY: {
      type: "choice",
      options: ["auto", "scroll", "hidden", "visible"],
    },
    whiteSpace: {
      type: "choice",
      options: ["normal", "nowrap", "pre", "pre-line", "pre-wrap"],
    },
    children: {
      type: "slot",
      allowedComponents: [getPlasmicComponentName("Table")],
      defaultValue: {
        type: "component",
        name: getPlasmicComponentName("Table"),
        props: {
          children: [
            {
              type: "component",
              name: getPlasmicComponentName("Thead"),
              props: {
                children: {
                  type: "component",
                  name: getPlasmicComponentName("Tr"),
                  props: {
                    children: [
                      {
                        type: "component",
                        name: getPlasmicComponentName("Th"),
                        props: {
                          children: {
                            type: "text",
                            value: "TO CONVERT",
                          },
                        },
                      },
                      {
                        type: "component",
                        name: getPlasmicComponentName("Th"),
                        props: {
                          children: {
                            type: "text",
                            value: "INTO",
                          },
                        },
                      },
                      {
                        type: "component",
                        name: getPlasmicComponentName("Th"),
                        props: {
                          children: {
                            type: "text",
                            value: "MULTIPLY BY",
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              type: "component",
              name: getPlasmicComponentName("Tbody"),
              props: {
                children: [
                  {
                    type: "component",
                    name: getPlasmicComponentName("Tr"),
                    props: {
                      children: [
                        {
                          type: "component",
                          name: getPlasmicComponentName("Td"),
                          props: {
                            children: {
                              type: "text",
                              value: "inches",
                            },
                          },
                        },
                        {
                          type: "component",
                          name: getPlasmicComponentName("Td"),
                          props: {
                            children: {
                              type: "text",
                              value: "millimetres (mm)",
                            },
                          },
                        },
                        {
                          type: "component",
                          name: getPlasmicComponentName("Td"),
                          props: {
                            children: {
                              type: "text",
                              value: "25.4",
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  },
};

export const tfootMeta: ComponentMeta<TableFooterProps> = {
  ...getComponentNameAndImportMeta("Tfoot", "Table"),
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "component",
          name: getPlasmicComponentName("Tr"),
          props: {
            children: [
              {
                type: "component",
                name: getPlasmicComponentName("Th"),
                props: {
                  children: {
                    type: "text",
                    value: "Name",
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
