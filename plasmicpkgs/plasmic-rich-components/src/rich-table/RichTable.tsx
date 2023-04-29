import { EllipsisOutlined, PlusOutlined } from "@ant-design/icons";
import {
  ActionType,
  ProColumns,
  ProTable,
  TableDropdown,
} from "@ant-design/pro-components";
import {
  ManyRowsResult,
  TableFieldType,
  TableSchema,
} from "@plasmicapp/data-sources";
import { DataProvider } from "@plasmicapp/host";
import { Button, Dropdown } from "antd";
import type { SizeType } from "antd/es/config-provider/SizeContext";
import type { GetRowKey, SorterResult } from "antd/es/table/interface";
import { createObjectCsvStringifier } from "csv-writer-browser";
import fastStringify from "fast-stringify";
import React, { ReactNode, useRef, useState } from "react";
import { useIsClient } from "../common";
import {
  ColumnConfig,
  deriveFieldConfigs,
  PartialColumnConfig,
} from "../field-mappings";

// Avoid csv-stringify, it doesn't directly work in browser without Buffer polyfill.

export type QueryResult = Partial<ManyRowsResult<any>> & {
  error?: any;
  isLoading?: boolean;
};

export interface Action {
  type: "edit" | "view" | "delete" | "custom";
  label?: string;
  moreMenu?: boolean;
}

export interface ControlContextData {
  data: unknown[];
  schema?: TableSchema;
  mergedFields: ColumnConfig[];
  minimalFullLengthFields: PartialColumnConfig[];
}

export interface RichTableProps {
  className?: string;
  data?: QueryResult;
  fields?: PartialColumnConfig[];
  // children?: React.ReactNode;
  defaultSize?: SizeType;
  pagination?: boolean;

  canSelectRows?: "none" | "single" | "multiple";

  selectedRowKey?: string | string[];
  onRowSelectionChanged?: (rowKeys: string[], rows: any[]) => void;

  rowKey?: string | GetRowKey<any>;

  setControlContextData?: (ctx: ControlContextData) => void;
  title?: ReactNode;

  addHref?: string;

  actions?: Action[];
  customActionChildren?: ReactNode;

  pageSize?: number;

  hideSearch?: boolean;
  hideDensity?: boolean;
  hideColumnPicker?: boolean;
  hideExports?: boolean;
}

function tryGetSchema(data?: QueryResult): TableSchema | undefined {
  if (data?.schema) {
    return data.schema;
  }
  if (Array.isArray(data)) {
    data = { data };
  }
  if (!data?.data || !Array.isArray(data.data) || data.data.length === 0) {
    return undefined;
  }
  const fieldMap: Record<string, TableFieldType> = {};
  data.data.forEach((entry: any) => {
    if (entry && typeof entry === "object") {
      Array.from(Object.entries(entry)).forEach(([k, v]) => {
        const inferredType: TableFieldType =
          typeof v === "string"
            ? "string"
            : typeof v === "boolean"
            ? "boolean"
            : typeof v === "number"
            ? "number"
            : "unknown";
        if (fieldMap[k] && fieldMap[k] !== inferredType) {
          fieldMap[k] = "unknown";
        } else {
          fieldMap[k] = inferredType;
        }
      });
    }
  });
  return {
    id: "inferred",
    fields: Object.entries(fieldMap).map(([f, t]) => ({
      id: f,
      type: t,
      readOnly: false,
    })),
  };
}

interface NormalizedData {
  data: Record<string, unknown>[];
  schema?: TableSchema;
}

function normalizeData(rawData: unknown): NormalizedData | undefined {
  if (!rawData || typeof rawData !== "object") {
    return undefined;
  }
  const obj = Array.isArray(rawData) ? { data: rawData } : rawData!;
  if (!("data" in obj)) {
    return undefined;
  }
  const objWithData = obj as { data: unknown[] };
  if (!Array.isArray(objWithData.data) || objWithData.data.length === 0) {
    return undefined;
  }
  // Make TS happy.
  const normed = {
    ...objWithData,
    data: objWithData.data as Record<string, unknown>[],
  };
  const schema = tryGetSchema(rawData as any);
  if (!schema) {
    return undefined;
  }
  return { ...normed, schema };
}

/**
 * Render booleans, objects, arrays, etc. as JSON repr.
 */
function safeRender(x: unknown) {
  return x === undefined || x === null
    ? ""
    : typeof x === "string"
    ? x
    : typeof x === "number"
    ? x.toString()
    : JSON.stringify(x);
}

export function RichTable(props: RichTableProps) {
  const {
    className,
    data: rawData = {
      data: [],
      schema: {
        id: "inferred",
        fields: [
          {
            id: "id",
            type: "string",
            readOnly: false,
          },
        ],
      },
    },
    // children,
    pagination = true,
    defaultSize,
    title,
    addHref,
    pageSize = 10,
    hideSearch,
    hideDensity,
    hideColumnPicker,
    hideExports,
    rowKey,
  } = props;

  const data = normalizeData(rawData);

  const { columnDefinitions, normalized } = useColumnDefinitions(data, props);

  const actionRef = useRef<ActionType>();

  const { finalData, search, setSearch, setSortState } = useSortedFilteredData(
    data,
    normalized
  );

  const rowSelection = useRowSelection(data, props);
  // const { containerRef, tableHeight } = useScrollHeight(data, props);

  const isClient = useIsClient();

  if (!isClient) {
    return null;
  }

  return (
    <div className={className}>
      <ProTable
        actionRef={actionRef}
        columns={columnDefinitions}
        onChange={(_pagination, _filters, sorter, _extra) => {
          setSortState({ sorter: sorter as any });
        }}
        style={{
          width: "100%",
        }}
        cardProps={{
          ghost: true,
        }}
        rowSelection={rowSelection}
        dataSource={finalData}
        rowKey={deriveRowKey(data, rowKey)}
        defaultSize={defaultSize}
        editable={{ type: "multiple" }}
        search={false}
        options={{
          setting: hideColumnPicker
            ? false
            : {
                listsHeight: 400,
              },
          reload: false,
          density: !hideDensity,
        }}
        pagination={
          pagination
            ? {
                pageSize,
                onChange: (page) => console.log(page),
                showSizeChanger: false,
              }
            : false
        }
        dateFormatter="string"
        headerTitle={title}
        // TODO in the future, figure out how to make this responsive to the CSS height
        // scroll={{ x: scrollX || undefined, y: scrollHeight }}
        toolbar={{
          search: !hideSearch
            ? {
                value: search,
                onChange: (e) => setSearch(e.target.value),
                onSearch: () => {
                  return;
                },
                placeholder: "Search",
              }
            : undefined,
        }}
        toolBarRender={() => [
          addHref && (
            <Button
              key="button"
              icon={<PlusOutlined />}
              type="primary"
              href={addHref}
            >
              Add
            </Button>
          ),
          !hideExports && <ExportMenu data={data} />,
        ]}
      />
      {/*Always hide the weird pin left/right buttons for now, which also have render layout issues*/}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          :where(.css-dev-only-do-not-override-1p704s4).ant-pro-table-column-setting-overlay .ant-tree-treenode:hover .ant-pro-table-column-setting-list-item-option {
            display: none;
          }
          .ant-pro-table-list-toolbar-right {
            flex-wrap: initial;
            flex-shrink: 0;
          }
          .ant-pro-table, .ant-pro-table > .ant-pro-card, .ant-pro-table .ant-table-wrapper, .ant-pro-table .ant-spin-nested-loading, .ant-pro-table .ant-table-container {
            height: 100%;
          }
          .ant-pro-table .ant-spin-container {
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .ant-pro-table .ant-table {
            flex-grow: 1;
            min-height: 0;
          }
          .ant-pro-table .ant-pagination {
            flex-shrink: 0;
          }
          .ant-pro-table .ant-table-content {
            overflow: auto !important;
            height: 100%;
          }
          .ant-pro-table > .ant-pro-card > .ant-pro-card-body {
            display: flex;
            flex-direction: column;
          }
          .ant-pro-table .ant-table-wrapper {
            flex-grow: 1;
            min-height: 0;
          }
          .ant-pro-table .ant-table-thead > tr > th {
            position: sticky;
            top: 0;
            z-index: 2;
          }
          .ant-pro-table .ant-table-thead > tr > th.ant-table-cell-fix-left, .ant-pro-table .ant-table-thead > tr > th.ant-table-cell-fix-right {
            z-index: 3;
          }
          .ant-pro-table .ant-table-tbody > tr > td {
            z-index: 0;
          }
          .ant-pro-table .ant-table-tbody > tr > td.ant-table-cell-fix-left,.ant-pro-table .ant-table-tbody > tr > td.ant-table-cell-fix-right {
            z-index: 1;
          }
      `,
        }}
      />
    </div>
  );
}

export function deriveRowKey(
  data: React.ComponentProps<typeof RichTable>["data"],
  rowKey: React.ComponentProps<typeof RichTable>["rowKey"]
) {
  if (rowKey) {
    return rowKey;
  }
  const schema = tryGetSchema(data);
  if (schema) {
    return schema.fields[0]?.id;
  }
  return undefined;
}

function useColumnDefinitions(
  data: NormalizedData | undefined,
  props: React.ComponentProps<typeof RichTable>
) {
  const { fields, setControlContextData, actions, customActionChildren } =
    props;
  return React.useMemo(() => {
    const schema = tryGetSchema(data);
    if (!data || !schema) {
      return { normalized: [], columnDefinitions: [] };
    }
    const { mergedFields, minimalFullLengthFields } = deriveFieldConfigs(
      fields ?? [],
      schema
    );
    setControlContextData?.({ ...data, mergedFields, minimalFullLengthFields });
    const normalized = mergedFields;
    const columnDefinitions = normalized
      .filter((cconfig) => !cconfig.isHidden)
      .map((cconfig, _columnIndex, _columnsArray) => {
        const columnDefinition: ProColumns<any> = {
          dataIndex: cconfig.fieldId,
          title: cconfig.title,
          // dataIndex: cconfig,
          key: cconfig.key,
          valueType:
            cconfig.dataType === "auto"
              ? undefined
              : cconfig.dataType === "string"
              ? "text"
              : cconfig.dataType === "number"
              ? "digit"
              : cconfig.dataType === "boolean"
              ? "switch"
              : undefined,

          // To come later
          readonly: false,
          sorter: true,
          copyable: false,
          ellipsis: false,
          tip: undefined,
          formItemProps: {
            rules: [],
          },
          disable: false,
          valueEnum: undefined,
          search: undefined,
          hideInSearch: false,
          renderFormItem: (_, { defaultRender }) => {
            return defaultRender(_);
          },

          render: (value: any, record: any, rowIndex: any) => {
            return (
              <DataProvider name="currentRow" data={record}>
                <DataProvider name="currentRowIndex" data={rowIndex}>
                  <DataProvider name="currentColumn" data={value}>
                    {safeRender(cconfig.expr ? cconfig.expr(record) : value)}
                    {/*{showChildren &&*/}
                    {/*  children &&*/}
                    {/*  (typeof children === "object"*/}
                    {/*    ? (Array.isArray(children) ? children : [children]).map(*/}
                    {/*        (child) =>*/}
                    {/*          repeatedElement(*/}
                    {/*            rowIndex * columnsArray.length + columnIndex,*/}
                    {/*            child*/}
                    {/*          )*/}
                    {/*      )*/}
                    {/*    : children)}*/}
                  </DataProvider>
                </DataProvider>
              </DataProvider>
            );
          },
        };

        return columnDefinition;
      });
    if (actions && actions.length > 0) {
      columnDefinitions.push({
        title: "Actions",
        valueType: "option",
        key: "__plasmicActions",
        render: (_text, record, _, action) => [
          ...actions
            .filter((_action) => !_action.moreMenu)
            .map((_action, aindex) =>
              _action.type === "edit" ? (
                <a
                  key={aindex}
                  onClick={() => {
                    action?.startEditable?.(record.id);
                  }}
                >
                  Edit
                </a>
              ) : _action.type === "view" ? (
                <a key={aindex} href={record.url}>
                  View
                </a>
              ) : _action.type === "delete" ? (
                <a
                  key={aindex}
                  onClick={() => {
                    // TODO delete
                  }}
                >
                  Delete
                </a>
              ) : (
                customActionChildren
              )
            ),
          <TableDropdown
            key="actionGroup"
            onSelect={() => action?.reload()}
            menus={actions
              .filter((_action) => !!_action.moreMenu)
              .map((_action, aindex) => ({
                key: "" + aindex,
                name: _action.label ?? _action.type,
              }))}
          />,
        ],
      });
    }
    return { normalized, columnDefinitions };
  }, [fields, data, setControlContextData, actions, customActionChildren]);
}

function useSortedFilteredData(
  data: NormalizedData | undefined,
  columns: ColumnConfig[]
) {
  const [search, setSearch] = useState("");
  const [sortState, setSortState] = useState<
    undefined | { sorter: SorterResult<Record<string, any>> }
  >(undefined);
  const finalData = React.useMemo(() => {
    const filtered = data?.data?.filter((row) =>
      fastStringify(Object.values(row)).toLowerCase().includes(search)
    );
    const sorted = sortState?.sorter.column
      ? // We use .sort() rather than sortBy to use localeCompare
        (() => {
          const expr =
            columns.find(
              (cconfig) => cconfig.key === sortState?.sorter.column?.key
            )!.expr ?? ((x) => x);
          return (filtered ?? []).sort((aa, bb) => {
            const a = expr(aa) ?? null,
              b = expr(bb) ?? null;
            // Default nil to '' here because A < null < z which is weird.
            return typeof a === "string"
              ? a.localeCompare(b ?? "")
              : typeof b === "string"
              ? -b.localeCompare(a ?? "")
              : a - b;
          });
        })()
      : filtered;
    const reversed =
      sortState?.sorter.order === "descend" ? sorted?.reverse() : sorted;
    return reversed;
  }, [data, columns, sortState, search]);

  return {
    finalData,
    search,
    setSearch,
    setSortState,
  };
}

function useRowSelection(
  data: NormalizedData | undefined,
  props: React.ComponentProps<typeof RichTable>
) {
  const { canSelectRows, selectedRowKey, onRowSelectionChanged, rowKey } =
    props;
  const deriveSelectedRowKeys = () => {
    if (
      !canSelectRows ||
      canSelectRows === "none" ||
      !deriveRowKey(data, rowKey)
    ) {
      return [];
    }

    if (typeof selectedRowKey === "string") {
      return [selectedRowKey];
    } else if (Array.isArray(selectedRowKey)) {
      if (canSelectRows === "single") {
        return selectedRowKey.slice(0, 1);
      } else {
        return selectedRowKey;
      }
    } else {
      return [];
    }
  };

  const rowSelection: React.ComponentProps<typeof ProTable>["rowSelection"] =
    canSelectRows && canSelectRows !== "none"
      ? {
          type: canSelectRows === "single" ? "radio" : "checkbox",
          selectedRowKeys: deriveSelectedRowKeys(),
          onChange: (rowKeys, rows) => {
            onRowSelectionChanged?.(rowKeys as string[], rows);
          },
          alwaysShowAlert: true,
        }
      : undefined;
  return rowSelection;
}

function ExportMenu(props: { data: NormalizedData | undefined }) {
  const { data } = props;

  return (
    <Dropdown
      key="menu"
      menu={{
        items: [
          {
            label: "Download as CSV",
            key: "csv",
            onClick: async () => {
              const writer = createObjectCsvStringifier({
                header:
                  tryGetSchema(data)?.fields.map((f) => ({
                    id: f.id,
                    title: f.id,
                  })) ?? [],
              });
              const dataStr =
                writer.getHeaderString() +
                writer.stringifyRecords(data?.data as any);

              // const dataStr = stringify(data?.data as any, {
              //   columns:
              //     tryGetSchema(data)?.fields.map((f) => f.id) ?? [],
              //   header: true,
              // });

              const filename = "data.csv";

              // Adapted from https://stackoverflow.com/a/68771795
              const blob = new Blob([dataStr], {
                type: "text/csv;charset=utf-8;",
              });
              if ((navigator as any).msSaveBlob) {
                // In case of IE 10+
                (navigator as any).msSaveBlob(blob, filename);
              } else {
                const link = document.createElement("a");
                if (link.download !== undefined) {
                  // Browsers that support HTML5 download attribute
                  const url = URL.createObjectURL(blob);
                  link.setAttribute("href", url);
                  link.setAttribute("download", filename);
                  link.style.visibility = "hidden";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }
            },
          },
          {
            label: "Download as JSON",
            key: "json",
            onClick: () => {
              const dataStr = fastStringify(data?.data);
              const dataUri = `data:application/json;charset=utf-8, ${encodeURIComponent(
                dataStr
              )}`;

              const exportFileDefaultName = "data.json";

              const linkElement = document.createElement("a");
              linkElement.setAttribute("href", dataUri);
              linkElement.setAttribute("download", exportFileDefaultName);
              linkElement.click();
            },
          },
        ],
      }}
    >
      <Button>
        <EllipsisOutlined />
      </Button>
    </Dropdown>
  );
}
