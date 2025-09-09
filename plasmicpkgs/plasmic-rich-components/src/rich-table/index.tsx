import { CodeComponentMeta } from "@plasmicapp/host";
import {
  commonProps,
  dataProp,
  onRowClickProp,
  rowActionsProp,
} from "../common-prop-types";
import { buildFieldsPropType } from "../field-mappings";
import { Registerable, registerComponentHelper } from "../utils";
import { RichTable, RichTableProps, TableColumnConfig } from "./RichTable";

export * from "./RichTable";
export default RichTable;

export const tableHelpers = {
  states: {
    selectedRow: {
      onChangeArgsToValue: (_rowKeys: string[], rows: any[]) => {
        return rows[0];
      },
    },
    selectedRows: {
      onChangeArgsToValue: (_rowKeys: string[], rows: any[]) => {
        return rows;
      },
    },
    selectedRowKey: {
      onChangeArgsToValue: (rowKeys: string[], _rows: any[]) => {
        return rowKeys[0];
      },
    },
    selectedRowKeys: {
      onChangeArgsToValue: (rowKeys: string[], _rows: any[]) => {
        return rowKeys;
      },
    },
  },
};

const dataTableMeta: CodeComponentMeta<RichTableProps> = {
  name: "hostless-rich-table",
  displayName: "Table",
  defaultStyles: {
    width: "stretch",
    padding: "16px",
    maxHeight: "100%",
  },
  props: {
    data: dataProp(),

    fields: buildFieldsPropType<TableColumnConfig, RichTableProps>({
      fieldTypes: {
        disableSorting: {
          type: "boolean",
          displayName: "Disable sorting?",
          defaultValueHint: false,
        },
      },
    }),

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
    },

    selectedRowKey: {
      type: "string",
      displayName: "Selected Row Key",
      hidden: (ps) =>
        ps.canSelectRows !== "single" && ps.canSelectRows !== "click",
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

    onRowClick: onRowClickProp(),

    rowActions: rowActionsProp(),

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

    ...commonProps(),

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
      hidden: (ps) =>
        !(ps.canSelectRows === "click" || ps.canSelectRows === "single"),
      ...tableHelpers.states.selectedRowKey,
    },
    selectedRowKeys: {
      type: "writable",
      valueProp: "selectedRowKeys",
      onChangeProp: "onRowSelectionChanged",
      variableType: "array",
      hidden: (ps) => !(ps.canSelectRows === "multiple"),
      ...tableHelpers.states.selectedRowKeys,
    },
    selectedRow: {
      type: "readonly",
      onChangeProp: "onRowSelectionChanged",
      variableType: "object",
      hidden: (ps) =>
        !(ps.canSelectRows === "click" || ps.canSelectRows === "single"),
      ...tableHelpers.states.selectedRow,
    },
    selectedRows: {
      type: "readonly",
      onChangeProp: "onRowSelectionChanged",
      variableType: "array",
      hidden: (ps) => !(ps.canSelectRows === "multiple"),
      ...tableHelpers.states.selectedRows,
    },
  },
  componentHelpers: {
    helpers: tableHelpers,
    importName: "tableHelpers",
    importPath: "@plasmicpkgs/plasmic-rich-components/skinny/rich-table",
  },
  importName: "RichTable",
  importPath: "@plasmicpkgs/plasmic-rich-components/skinny/rich-table",
};

export function registerRichTable(loader?: Registerable) {
  registerComponentHelper(loader, RichTable, dataTableMeta);
}
