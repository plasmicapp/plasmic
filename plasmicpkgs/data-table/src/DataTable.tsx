import { DataProvider, repeatedElement, useSelector } from "@plasmicapp/host";
import type {
  ManyRowsResult,
  TableFieldType,
  TableSchema,
} from "@plasmicapp/data-sources";
import React from "react";
import type { SizeType } from "antd/es/config-provider/SizeContext";
import { Table } from "antd";

export type QueryResult = Partial<ManyRowsResult<any>> & {
  error?: any;
  isLoading?: boolean;
};

export interface DataTableProps {
  className?: string;
  data?: QueryResult;
  columns?: string[];
  children?: React.ReactNode;
  size?: SizeType;
  pagination?: boolean;
  onSelect?: (record: any) => void;
  setControlContextData?: (schema: TableSchema) => void;
}

function tryGetSchema(data?: QueryResult): TableSchema | undefined {
  if (data?.schema) {
    return data.schema;
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
            ? "text"
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
    })),
  };
}

export function DataTable(props: DataTableProps) {
  const {
    className,
    data,
    children,
    size,
    columns,
    onSelect,
    pagination,
    setControlContextData,
  } = props;

  const columnDefinitions = React.useMemo(() => {
    const schema = tryGetSchema(data);
    if (!schema) {
      return [];
    }
    setControlContextData?.(schema);
    return (
      (columns && columns.length > 0 ? columns : undefined) ??
      schema.fields.map((f) => f.id)
    ).map((columnId, columnIndex, columnsArray) => {
      const columnDefinition = {
        columnIndex,
        title: schema.fields.find((f) => f.id === columnId)?.label || columnId,
        dataIndex: columnId,
        key: columnId,
        render: (value: any, record: any, rowIndex: any) => {
          return (
            <DataProvider name="currentRow" data={record}>
              <DataProvider name="currentRowIndex" data={rowIndex}>
                <DataProvider name="currentColumn" data={value}>
                  {children &&
                    (typeof children === "object"
                      ? (Array.isArray(children) ? children : [children]).map(
                          (child) =>
                            repeatedElement(
                              rowIndex * columnsArray.length + columnIndex,
                              child
                            )
                        )
                      : children)}
                </DataProvider>
              </DataProvider>
            </DataProvider>
          );
        },
      };

      return columnDefinition;
    });
  }, [children, columns, data, setControlContextData]);

  return (
    <Table
      className={className}
      columns={columnDefinitions}
      dataSource={data?.data}
      size={size}
      onRow={(record) => {
        return {
          onMouseUp: () => {
            return onSelect?.(record.id);
          },
        };
      }}
      pagination={pagination ? undefined : pagination}
      rowKey={"id"}
    />
  );
}

export default DataTable;

export interface TableValueProps {
  className?: string;
}

export function TableValue(props: TableValueProps) {
  const { className } = props;
  const column = useSelector("currentColumn");
  return <div className={className}>{column?.toString() ?? ""}</div>;
}
