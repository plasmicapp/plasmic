import {
  Table,
  TableBodyProps,
  TableCaption,
  TableCaptionProps,
  TableCellProps,
  TableColumnHeaderProps,
  TableContainer,
  TableContainerProps,
  TableHeadProps,
  TableProps,
  TableRowProps,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";

export const tableMeta: ComponentMeta<TableProps> = {
  name: "Table",
  importPath: "@chakra-ui/react",
  parentComponentName: "TableContainer",
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

export function registerTable(
  loader?: Registerable,
  customTableMeta?: ComponentMeta<TableProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Table, customTableMeta ?? tableMeta);
}

export const tableCaptionMeta: ComponentMeta<TableCaptionProps> = {
  name: "TableCaption",
  importPath: "@chakra-ui/react",
  parentComponentName: "Table",
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

export function registerTableCaption(
  loader?: Registerable,
  customTableCaptionMeta?: ComponentMeta<TableCaptionProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(TableCaption, customTableCaptionMeta ?? tableCaptionMeta);
}

export const theadMeta: ComponentMeta<TableHeadProps> = {
  name: "Thead",
  importPath: "@chakra-ui/react",
  parentComponentName: "Table",
  props: {
    children: {
      type: "slot",
      allowedComponents: ["Th", "Tr"],
    },
  },
};

export function registerThead(
  loader?: Registerable,
  customTheadMeta?: ComponentMeta<TableHeadProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Thead, customTheadMeta ?? theadMeta);
}

export const tbodyMeta: ComponentMeta<TableBodyProps> = {
  name: "Tbody",
  importPath: "@chakra-ui/react",
  parentComponentName: "Table",
  props: {
    children: {
      type: "slot",
      allowedComponents: ["Td", "Tr"],
    },
  },
};

export function registerTbody(
  loader?: Registerable,
  customTbodyMeta?: ComponentMeta<TableBodyProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Tbody, customTbodyMeta ?? tbodyMeta);
}

export const trMeta: ComponentMeta<TableRowProps> = {
  name: "Tr",
  importPath: "@chakra-ui/react",
  parentComponentName: "Table",
  props: {
    children: {
      type: "slot",
      allowedComponents: ["Td", "Th"],
    },
  },
};

export function registerTr(
  loader?: Registerable,
  customTrMeta?: ComponentMeta<TableRowProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Tr, customTrMeta ?? trMeta);
}

export const tdMeta: ComponentMeta<TableCellProps> = {
  name: "Td",
  importPath: "@chakra-ui/react",
  parentComponentName: "Tr",
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

export function registerTd(
  loader?: Registerable,
  customTdMeta?: ComponentMeta<TableCellProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Td, customTdMeta ?? tdMeta);
}

export const thMeta: ComponentMeta<TableColumnHeaderProps> = {
  name: "Th",
  importPath: "@chakra-ui/react",
  parentComponentName: "Tr",
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

export function registerTh(
  loader?: Registerable,
  customThMeta?: ComponentMeta<TableColumnHeaderProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Th, customThMeta ?? thMeta);
}

export const tableContainerMeta: ComponentMeta<TableContainerProps> = {
  name: "TableContainer",
  importPath: "@chakra-ui/react",
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
      allowedComponents: ["Table"],
      defaultValue: {
        type: "component",
        name: "Table",
        props: {
          children: [
            {
              type: "component",
              name: "Thead",
              props: {
                children: {
                  type: "component",
                  name: "Tr",
                  props: {
                    children: [
                      {
                        type: "component",
                        name: "Th",
                        props: {
                          children: {
                            type: "text",
                            value: "TO CONVERT",
                          },
                        },
                      },
                      {
                        type: "component",
                        name: "Th",
                        props: {
                          children: {
                            type: "text",
                            value: "INTO",
                          },
                        },
                      },
                      {
                        type: "component",
                        name: "Th",
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
              name: "Tbody",
              props: {
                children: [
                  {
                    type: "component",
                    name: "Tr",
                    props: {
                      children: [
                        {
                          type: "component",
                          name: "Td",
                          props: {
                            children: {
                              type: "text",
                              value: "inches",
                            },
                          },
                        },
                        {
                          type: "component",
                          name: "Td",
                          props: {
                            children: {
                              type: "text",
                              value: "millimetres (mm)",
                            },
                          },
                        },
                        {
                          type: "component",
                          name: "Td",
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

export function registerTableContainer(
  loader?: Registerable,
  customTableContainerMeta?: ComponentMeta<TableContainerProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(
    TableContainer,
    customTableContainerMeta ?? tableContainerMeta
  );
}
