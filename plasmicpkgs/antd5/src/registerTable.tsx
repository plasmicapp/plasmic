import Table from "antd/es/table";
import type { TableRowSelection } from "antd/es/table/interface";
import React from "react";
import { asArray, Registerable, registerComponentHelper } from "./utils";

export function AntdTable(
  props: React.ComponentProps<typeof Table> & {
    data: any;
    rowKey?: string;
    isSelectable?: undefined | "single" | "multiple";
    selectedRowKeys?: string[];
    onSelectionChange?: (keys: React.Key[], rows: any[]) => void;
    setControlContextData?: (ctx: any) => void;
  }
) {
  const {
    data,
    onSelectionChange,
    isSelectable,
    rowKey,
    setControlContextData,
    selectedRowKeys,
    ...rest
  } = props;
  setControlContextData?.(data);
  const selection: TableRowSelection<any> | undefined = isSelectable
    ? {
        onChange: (rowKeys, rows) => {
          onSelectionChange?.(rowKeys, rows);
        },
        type: isSelectable === "single" ? "radio" : "checkbox",
        selectedRowKeys: asArray(selectedRowKeys) ?? [],
      }
    : undefined;
  return (
    <Table
      loading={data?.isLoading}
      dataSource={data?.data}
      rowSelection={selection}
      rowKey={rowKey}
      {...rest}
    />
  );
}

export const AntdColumnGroup = Table.ColumnGroup;
export const AntdColumn = Table.Column;

export function registerTable(loader?: Registerable) {
  registerComponentHelper(loader, AntdTable, {
    name: "plasmic-antd5-table",
    displayName: "Table",
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
        hidden: (ps: any) => !ps.isSelectable,
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
      onSelectionChange: {
        type: "eventHandler",
        argTypes: [
          { name: "keys", type: "object" },
          { name: "rows", type: "object" },
        ],
        hidden: (ps: any) => !ps.isSelectable,
      } as any,
    },
    importPath: "@plasmicpkgs/antd5/registerTable",
    importName: "AntdTable",
    unstable__states: {
      selectedRows: {
        type: "writable",
        valueProp: "selectedRowKeys",
        onChangeProp: "onSelectionChange",
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
      },
      render: {
        type: "slot",
        renderPropParams: ["cell", "row", "index"],
      } as any,
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
    importPath: "@plasmicpkgs/antd5/registerTable",
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
