import { ComponentMeta } from "@plasmicapp/host/registerComponent";
import { buildFieldsPropType } from "../field-mappings";
import { Registerable, registerComponentHelper } from "../utils";
import {
  RichTable,
  RichTableProps,
  TableColumnConfig,
  deriveRowKey,
} from "./RichTable";

export * from "./RichTable";
export default RichTable;

export const tableHelpers = {
  states: {
    selectedRow: {
      onChangeArgsToValue: (rowKeys: string[], rows: any[]) => {
        return rows[0];
      },
    },
    selectedRows: {
      onChangeArgsToValue: (rowKeys: string[], rows: any[]) => {
        return rows;
      },
    },
    selectedRowKey: {
      onChangeArgsToValue: (rowKeys: string[], rows: any[]) => {
        return rowKeys;
      },
    },
  },
};

const dataTableMeta: ComponentMeta<RichTableProps> = {
  name: "hostless-rich-table",
  displayName: "Table",
  defaultStyles: {
    width: "stretch",
    padding: "16px",
    maxHeight: "100%",
  },
  props: {
    data: {
      type: "dataSourceOpData" as any,
      description: "The data to display in the table",
    },

    fields: buildFieldsPropType<TableColumnConfig, RichTableProps>({}),

    canSelectRows: {
      type: "choice",
      displayName: "Select rows?",
      options: [
        { label: "No", value: "none" },
        { label: "By clicking a row", value: "click" },
        { label: "Using radio buttons", value: "single" },
        { label: "Using checkboxes", value: "multiple" },
      ],
      defaultValueHint: "none",
      description:
        "Lets user select table rows by clicking on a row, or using radio buttons, or checkboxes if multiple rows can be selected together. If you have interactive elements in your row and you don't want clicking on them to select the row, you may use radio buttons instead.",
    },

    rowKey: {
      type: "string",
      displayName: "Row key",
      helpText:
        "Column key to use as row key; can also be a function that takes in a row and returns a key value",
      hidden: (ps) => !ps.canSelectRows || ps.canSelectRows === "none",
      defaultValueHint: (ps) => deriveRowKey(ps.data, ps.rowKey),
    },

    selectedRowKey: {
      type: "string",
      displayName: "Selected Row Key",
      hidden: (ps) => ps.canSelectRows !== "single",
      advanced: true,
    },
    selectedRowKeys: {
      type: "array",
      displayName: "Selected Row Keys",
      hidden: (ps) => ps.canSelectRows !== "multiple",
      advanced: true,
    },
    onRowSelectionChanged: {
      type: "eventHandler",
      displayName: "On row selection changed",
      argTypes: [
        { name: "rowKeys", type: "object" },
        { name: "rows", type: "object" },
      ],
    },
    onRowClick: {
      type: "eventHandler",
      displayName: "On row clicked",
      argTypes: [
        { name: "rowKey", type: "string" },
        { name: "row", type: "object" },
        { name: "event", type: "object" },
      ],
    },

    rowActions: {
      type: "array",
      displayName: "Row actions",
      advanced: true,
      itemType: {
        type: "object",
        nameFunc: (item) => item.label,
        fields: {
          type: {
            type: "choice",
            options: ["item", "menu"],
            defaultValue: "item",
          },
          label: {
            type: "string",
            displayName: "Action label",
          },
          children: {
            type: "array",
            displayName: "Menu items",
            itemType: {
              type: "object",
              fields: {
                label: {
                  type: "string",
                  displayName: "Action label",
                },
                onClick: {
                  type: "eventHandler",
                  argTypes: [
                    { name: "rowKey", type: "string" },
                    { name: "row", type: "object" },
                  ],
                },
              },
            },
            hidden: (ps, ctx, { item }) => item.type !== "menu",
          },
          onClick: {
            type: "eventHandler",
            displayName: "Action",
            argTypes: [
              { name: "rowKey", type: "string" },
              { name: "row", type: "object" },
            ],
            hidden: (ps, ctx, { item }) => item.type !== "item",
          },
        },
      },
    },

    defaultSize: {
      displayName: "Density",
      type: "choice",
      options: [
        {
          value: "large",
          label: "Larger",
        },
        {
          value: "middle",
          label: "Medium",
        },
        {
          value: "small",
          label: "Compact",
        },
      ],
      defaultValueHint: "large",
      advanced: true,
    },

    pageSize: {
      type: "number",
      defaultValueHint: 10,
      advanced: true,
    },

    pagination: {
      type: "boolean",
      advanced: true,
      defaultValueHint: true,
    },

    hideSearch: {
      type: "boolean",
      description: "Hides the search toolbar",
      advanced: true,
    },

    hideExports: {
      type: "boolean",
      description: "Hides the button for exporting table data to CSV",
      advanced: true,
    },

    hideDensity: {
      type: "boolean",
      description: "Hides the control for changing the density of the table",
      advanced: true,
      defaultValueHint: true,
    },

    hideColumnPicker: {
      type: "boolean",
      description: "Hides the control for reordering and pinning columns",
      advanced: true,
    },

    hideSelectionBar: {
      type: "boolean",
      description: "Hides the toolbar that allows the user to clear selection",
      advanced: true,
      hidden: (ps) => !ps.canSelectRows || ps.canSelectRows === "none",
      defaultValueHint: true,
    },
    scopeClassName: {
      type: "styleScopeClass",
      scopeName: "instance",
    } as any,
    themeResetClassName: {
      type: "themeResetClass",
      targetAllTags: true,
    },
  },
  states: {
    selectedRowKey: {
      type: "writable",
      valueProp: "selectedRowKey",
      onChangeProp: "onRowSelectionChanged",
      variableType: "text",
      ...tableHelpers.states.selectedRowKey,
    },
    selectedRow: {
      type: "readonly",
      onChangeProp: "onRowSelectionChanged",
      variableType: "object",
      ...tableHelpers.states.selectedRow,
    },
    selectedRows: {
      type: "readonly",
      onChangeProp: "onRowSelectionChanged",
      variableType: "array",
      ...tableHelpers.states.selectedRows,
    },
  },
  componentHelpers: {
    helpers: tableHelpers,
    importName: "tableHelpers",
    importPath: "@plasmicpkgs/plasmic-rich-components",
  },
  importName: "RichTable",
  importPath: "@plasmicpkgs/plasmic-rich-components",
};

export function registerRichTable(loader?: Registerable) {
  registerComponentHelper(loader, RichTable, dataTableMeta);
}
