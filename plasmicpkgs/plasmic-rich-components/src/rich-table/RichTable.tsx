import { EllipsisOutlined, PlusOutlined } from "@ant-design/icons";
import {
  ActionType,
  ProColumns,
  ProTable,
  TableDropdown,
} from "@ant-design/pro-components";
import { TableSchema } from "@plasmicapp/data-sources";
import { Button, Dropdown } from "antd";
import type { SizeType } from "antd/es/config-provider/SizeContext";
import type { GetRowKey, SorterResult } from "antd/es/table/interface";
import { createObjectCsvStringifier } from "csv-writer-browser";
import fastStringify from "fast-stringify";
import React, { ReactNode, useRef, useState } from "react";
import { useIsClient } from "../common";
import {
  BaseColumnConfig,
  FieldfulProps,
  RowFunc,
  deriveFieldConfigs,
  deriveValueType,
  mkShortId,
} from "../field-mappings";
import { NormalizedData, normalizeData } from "../queries";
import { renderValue } from "../formatting";

// Avoid csv-stringify, it doesn't directly work in browser without Buffer polyfill.

export interface Action {
  type: "edit" | "view" | "delete" | "custom";
  label?: string;
  moreMenu?: boolean;
}

export interface ControlContextData {
  data: unknown[];
  schema?: TableSchema;
  mergedFields: TableColumnConfig[];
  minimalFullLengthFields: Partial<TableColumnConfig>[];
}

interface RowActionItem {
  type: "item";
  label: string;
  onClick: (rowKey: string, row: any) => void;
}

interface RowActionMenu {
  type: "menu";
  label: string;
  children?: RowActionItem[];
}

type RowAction = RowActionItem | RowActionMenu;

export interface RichTableProps extends FieldfulProps<TableColumnConfig> {
  defaultSize?: SizeType;
  pagination?: boolean;

  canSelectRows?: "none" | "click" | "single" | "multiple";

  selectedRowKey?: string | string[];
  onRowSelectionChanged?: (rowKeys: string[], rows: any[]) => void;
  onRowClick?: (rowKey: string, row: any, event: React.MouseEvent) => void;

  rowKey?: string | GetRowKey<any>;
  rowActions?: RowAction[];

  title?: ReactNode;

  addHref?: string;

  actions?: Action[];
  customActionChildren?: ReactNode;

  pageSize?: number;

  hideSearch?: boolean;
  hideDensity?: boolean;
  hideColumnPicker?: boolean;
  hideExports?: boolean;
  hideSelectionBar?: boolean;

  scopeClassName?: string;
  themeResetClassName?: string;
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
    hideDensity = true,
    hideColumnPicker,
    hideExports,
    hideSelectionBar = true,
    rowKey,
    scopeClassName,
  } = props;

  const data = normalizeData(rawData);

  const { columnDefinitions, normalized } = useColumnDefinitions(data, props);

  const actionRef = useRef<ActionType>();

  const { finalData, search, setSearch, setSortState } = useSortedFilteredData(
    data,
    normalized
  );

  const rowSelectionProps = useRowSelectionProps(data, props);

  const isClient = useIsClient();

  if (!isClient) {
    return null;
  }

  return (
    <div className={`${className} ${scopeClassName ?? ""}`}>
      <ProTable
        rowClassName={
          props.onRowClick || props.canSelectRows === "click"
            ? "plasmic-table-row-clickable"
            : undefined
        }
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
        {...rowSelectionProps}
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
        toolBarRender={() =>
          [
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
          ].filter((x) => !!x)
        }
      />
      {/*Always hide the weird pin left/right buttons for now, which also have render layout issues*/}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          :where(.css-dev-only-do-not-override-1p704s4).ant-pro-table-column-setting-overlay .ant-tree-treenode:hover .ant-pro-table-column-setting-list-item-option {
            display: none;
          }
          :where(.plasmic-table-row-clickable) {
            cursor: pointer;
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
          .ant-pro-table .ant-table-thead > tr > th, .ant-pro-table .ant-table-thead > tr > td.ant-table-selection-column {
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
          ${
            scopeClassName && hideSelectionBar
              ? `
          .${scopeClassName} .ant-pro-table-alert {
            display: none;
          }
          `
              : ""
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
  const schema = data?.schema;
  if (schema) {
    return schema.fields[0]?.id;
  }
  return undefined;
}

export function deriveKeyOfRow(
  row: any,
  rowKey: React.ComponentProps<typeof RichTable>["rowKey"]
) {
  if (typeof rowKey === "function") {
    return rowKey(row);
  } else if (typeof rowKey === "string") {
    return row[rowKey];
  } else {
    return undefined;
  }
}

interface StyleConfig {
  styles: Record<string, any>;
  align: "left" | "center" | "right";
  freeze: "off" | "left" | "right";
}

const defaultColumnConfig = (): TableColumnConfig =>
  ({
    key: mkShortId(),
    isEditableExpr: () => false,
    disableSorting: false,
    sortByExpr: undefined,
    isHidden: false,
    formatting: {
      styles: {},
      align: "left",
      freeze: "off",
    },
    dataType: "auto" as const,
  } as const);

export type TableColumnConfig = BaseColumnConfig & {
  isEditableExpr: RowFunc<boolean>;
  disableSorting: boolean;
  sortByExpr?: RowFunc<any>;
  formatting: StyleConfig;
};

function useColumnDefinitions(
  data: NormalizedData | undefined,
  props: React.ComponentProps<typeof RichTable>
) {
  const { fields, setControlContextData, rowActions } = props;
  return React.useMemo(() => {
    const schema = data?.schema;
    if (!data || !schema) {
      return { normalized: [], columnDefinitions: [] };
    }
    const { mergedFields, minimalFullLengthFields } =
      deriveFieldConfigs<TableColumnConfig>(fields ?? [], schema, (field) => ({
        ...defaultColumnConfig(),
        ...(field && {
          key: field.id,
          fieldId: field.id,
          title: field.label || field.id,
          expr: (currentItem) => currentItem[field.id],
        }),
      }));
    setControlContextData?.({ ...data, mergedFields, minimalFullLengthFields });
    const normalized = mergedFields;
    const columnDefinitions: ProColumns<any, any>[] = normalized
      .filter((cconfig) => !cconfig.isHidden)
      .map((cconfig, _columnIndex, _columnsArray) => {
        const columnDefinition: ProColumns<any, any> = {
          dataIndex: cconfig.fieldId,
          title: cconfig.title,
          // dataIndex: cconfig,
          key: cconfig.key,
          valueType: deriveValueType(cconfig),

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
            const cellValue = cconfig.fieldId
              ? record[cconfig.fieldId]
              : undefined;
            return renderValue(cellValue, record, cconfig);
          },
        };

        return columnDefinition;
      });
    if (rowActions && rowActions.length > 0) {
      columnDefinitions.push({
        title: "Actions",
        valueType: "option",
        key: "__plasmicActions",
        fixed: "right",
        className: props.themeResetClassName,
        render: (_text, row) => [
          ...rowActions.map((_action) => {
            if (_action.type === "item") {
              return (
                <a
                  key={_action.label}
                  style={{
                    whiteSpace: "nowrap",
                  }}
                  onClick={() =>
                    _action.onClick?.(
                      deriveKeyOfRow(row, deriveRowKey(data, props.rowKey)),
                      row
                    )
                  }
                >
                  {_action.label}
                </a>
              );
            } else {
              return (
                <TableDropdown
                  key={_action.label}
                  style={{
                    whiteSpace: "nowrap",
                  }}
                  menus={(_action.children ?? []).map((child) => ({
                    key: child.label,
                    name: child.label,
                    onClick: () =>
                      child.onClick?.(
                        deriveKeyOfRow(row, deriveRowKey(data, props.rowKey)),
                        row
                      ),
                  }))}
                >
                  {_action.label}
                </TableDropdown>
              );
            }
          }),
        ],
      });
    }
    return { normalized, columnDefinitions };
  }, [fields, data, setControlContextData, rowActions]);
}

function useSortedFilteredData(
  data: NormalizedData | undefined,
  columns: TableColumnConfig[]
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
          const cconfig = columns.find(
            (cc) => cc.key === sortState?.sorter.column?.key
          )!;
          const expr = cconfig.expr ?? ((x) => x);
          return (filtered ?? []).sort((aa, bb) => {
            const a =
                expr(aa, cconfig.fieldId ? aa?.[cconfig.fieldId] : null) ??
                null,
              b =
                expr(bb, cconfig.fieldId ? bb?.[cconfig.fieldId] : null) ??
                null;
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

function useRowSelectionProps(
  data: NormalizedData | undefined,
  props: React.ComponentProps<typeof RichTable>
): Partial<React.ComponentProps<typeof ProTable>> {
  const {
    canSelectRows,
    selectedRowKey,
    onRowSelectionChanged,
    rowKey,
    onRowClick,
  } = props;
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
      if (canSelectRows === "single" || canSelectRows === "click") {
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
          type:
            canSelectRows === "single" || canSelectRows === "click"
              ? "radio"
              : "checkbox",
          selectedRowKeys: deriveSelectedRowKeys(),
          onChange: (rowKeys, rows) => {
            onRowSelectionChanged?.(rowKeys as string[], rows);
          },
          alwaysShowAlert: true,
          ...(canSelectRows === "click" && {
            renderCell: () => null,
            columnWidth: 0,
            columnTitle: null,
            hideSelectAll: true,
          }),
        }
      : undefined;
  return {
    rowSelection,
    onRow: (row) => ({
      onClick: (event) => {
        const key = deriveKeyOfRow(row, deriveRowKey(data, rowKey));
        if (key != null) {
          if (canSelectRows === "click") {
            // Some heuristics to avoid selecting a row when
            // the object clicked is interactable -- like button, anchor,
            // input, etc.  This won't be bulletproof, so just some
            // heuristics!
            const target = event.target as HTMLElement;
            if (!isInteractable(target)) {
              onRowSelectionChanged?.([key], [row]);
            }
          }
          onRowClick?.(key, row, event);
        }
      },
    }),
  };
}

function isInteractable(target: HTMLElement) {
  if (["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
    return true;
  }
  if (target.contentEditable === "true") {
    return true;
  }

  return false;
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
                  data?.schema?.fields.map((f) => ({
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
