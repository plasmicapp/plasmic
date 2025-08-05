import { Table } from "antd";
import type { TableRowSelection } from "antd/es/table/interface";
import React from "react";
import { asArray, Registerable, registerComponentHelper } from "./utils";

export interface TableRef {
  selectRowByKey: (key: string) => void;
  selectRowByIndex: (index: number) => void;
  selectRowsByKeys: (keys: string[]) => void;
  selectRowsByIndexes: (indexs: number[]) => void;
  clearSelection: () => void;
}

export const AntdTable = React.forwardRef(function AntdTable(
  props: React.ComponentProps<typeof Table> & {
    data: any;
    rowKey?: string;
    isSelectable?: undefined | "single" | "multiple";
    selectedRowKeys?: string[];
    defaultSelectedRowKeys?: string[];
    onSelectedRowKeysChange?: (keys: string[]) => void;
    onSelectedRowsChange?: (rows: any[]) => void;
    setControlContextData?: (ctx: any) => void;
  },
  ref: React.Ref<TableRef>
) {
  const {
    data,
    onSelectedRowKeysChange,
    onSelectedRowsChange,
    isSelectable,
    rowKey,
    setControlContextData,
    selectedRowKeys,
    defaultSelectedRowKeys,
    ...rest
  } = props;
  setControlContextData?.(data);

  const isControlled = !!selectedRowKeys;
  const [uncontrolledSelectedRowKeys, setUncontrolledSelectedRowKeys] =
    React.useState<string[]>(defaultSelectedRowKeys ?? []);
  const selection: TableRowSelection<any> | undefined =
    isSelectable && rowKey
      ? {
          onChange: (rowKeys, rows) => {
            onSelectedRowsChange?.(rows);
            onSelectedRowKeysChange?.(rowKeys as string[]);
          },
          type: isSelectable === "single" ? "radio" : "checkbox",
          selectedRowKeys: isControlled
            ? asArray(selectedRowKeys)
            : uncontrolledSelectedRowKeys,
        }
      : undefined;

  React.useImperativeHandle(
    ref,
    () => ({
      selectRowByIndex(index: number) {
        if (data.data && rowKey) {
          const row = data.data[index];
          const rows = row ? [row] : [];
          this._setSelectedRows(rows);
        }
      },
      selectRowsByIndexes(indexes: number[]) {
        if (data.data && rowKey) {
          const rows = indexes.map((x) => data.data[x]).filter((x) => !!x);
          this._setSelectedRows(rows);
        }
      },
      selectRowByKey(key: string) {
        if (data.data && rowKey) {
          const rows = data.data.filter((r: any) => r[rowKey] === key);
          this._setSelectedRows(rows);
        }
      },
      selectRowsByKeys(keys: string[]) {
        if (data.data && rowKey) {
          const rows = data.data.filter((r: any) => keys.includes(r[rowKey]));
          this._setSelectedRows(rows);
        }
      },
      clearSelection() {
        this._setSelectedRows([]);
      },
      _setSelectedRows(rows: any[]) {
        onSelectedRowsChange?.(rows);
        if (rowKey) {
          onSelectedRowKeysChange?.(rows.map((r) => r[rowKey]));
        }
        if (!isControlled) {
          setUncontrolledSelectedRowKeys(rows.map((r) => r[rowKey!]));
        }
      },
    }),
    [data, onSelectedRowKeysChange, onSelectedRowsChange, isSelectable, rowKey]
  );
  return (
    <Table
      loading={data?.isLoading}
      dataSource={data?.data}
      rowSelection={selection}
      rowKey={rowKey}
      {...rest}
    />
  );
});

export const AntdColumnGroup = Table.ColumnGroup;
export const AntdColumn = Table.Column;

/** @deprecated Use the Table component from plasmic-rich-components instead */
export function registerTable(loader?: Registerable) {
  registerComponentHelper(loader, AntdTable, {
    name: "plasmic-antd5-table",
    displayName: "Table (deprecated)",
    props: {
      data: {
        type: "dataSourceOpData" as any,
        displayName: "Data",
      },
      children: {
        type: "slot",
        allowedComponents: [
          "plasmic-antd5-table-column",
          "plasmic-antd5-table-column-group",
        ],
      },
      bordered: {
        type: "boolean",
        defaultValueHint: false,
        advanced: true,
      },
      isSelectable: {
        type: "choice",
        options: ["single", "multiple"],
        displayName: "Select rows?",
      },
      rowKey: {
        type: "choice",
        options: (ps, ctx: any) => {
          if (ctx.schema) {
            return ctx.schema.fields.map((f: any) => ({
              value: f.id,
              label: f.label || f.id,
            }));
          }
          return [];
        },
        hidden: (ps) => !ps.isSelectable,
      },
      selectedRowKeys: {
        type: "choice",
        multiSelect: (ps) => ps.isSelectable === "multiple",
        options: (ps, ctx: any) => {
          const key = ps.rowKey;
          if (key && ctx.data) {
            return ctx.data.map((r: any) => r[key]);
          }
          return [];
        },
        hidden: (ps) => !ps.rowKey,
      },
      onSelectedRowKeysChange: {
        type: "eventHandler",
        argTypes: [{ name: "keys", type: "object" }],
        hidden: (ps) => !ps.isSelectable,
      },
      onSelectedRowsChange: {
        type: "eventHandler",
        argTypes: [{ name: "rows", type: "object" }],
        hidden: (ps) => !ps.isSelectable,
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerTable",
    importName: "AntdTable",
    states: {
      selectedRowKeys: {
        type: "writable",
        valueProp: "selectedRowKeys",
        onChangeProp: "onSelectedRowKeysChange",
        variableType: "array",
      },
      // selectedRows: {
      //   type: "readonly",
      //   onChangeProp: "onSelectedRowsChange",
      // },
    },
    refActions: {
      selectRowByIndex: {
        displayName: "Select row by index",
        argTypes: [
          {
            name: "index",
            displayName: "Index",
            type: "number",
          },
        ],
      },
      selectRowByKey: {
        displayName: "Select row by key",
        argTypes: [
          {
            name: "key",
            displayName: "Row key",
            type: "string",
          },
        ],
      },
    },
  });

  registerComponentHelper(loader, AntdColumn, {
    name: "plasmic-antd5-table-column",
    displayName: "Column",
    parentComponentName: "plasmic-antd5-table",
    props: {
      title: {
        type: "slot",
        defaultValue: "Column Name",
      },
      dataIndex: {
        type: "string",
        displayName: "Column key",
      },
      render: {
        type: "slot",
        renderPropParams: ["cell", "row", "index"],
        hidePlaceholder: true,
        displayName: "Custom render",
      },
      align: {
        type: "choice",
        options: ["left", "right", "center"],
        defaultValueHint: "left",
      },
      fixed: {
        type: "choice",
        options: ["left", "right"],
        advanced: true,
      },
      colSpan: {
        type: "number",
        advanced: true,
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerTable",
    importName: "AntdColumn",
    ...({ isRenderless: true } as any),
  });

  registerComponentHelper(loader, AntdColumnGroup, {
    name: "plasmic-antd5-table-column-group",
    displayName: "Column Group",
    parentComponentName: "plasmic-antd5-table",
    props: {
      title: {
        type: "slot",
        defaultValue: "Column Group Name",
      },
      children: {
        type: "slot",
        allowedComponents: ["plasmic-antd5-table-column"],
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerTable",
    importName: "AntdColumnGroup",
    ...({ isRenderless: true } as any),
  });
}
