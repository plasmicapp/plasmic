import { DataProvider, repeatedElement, useSelector } from "@plasmicapp/host";
import registerComponent, {
  type CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Table } from "antd";
import type { SizeType } from "antd/es/config-provider/SizeContext";
import React from "react";
import { Registerable } from "./registerable";

interface TableColumnProps {
  columnIndex: number;
  // The title text to show in the column headers
  title?: string;

  // The path for the data field to get the value from
  // Display field of the data record, support nest path by string array
  dataIndex: string | string[];

  // Plasmic - Custom column template
  columnTemplate: React.ReactNode;
}

// This is an empty virtual component used to allow users to define column
// properties in plasmic.
export function TableColumn(_props: TableColumnProps) {
  return null;
}

export interface TableValueProps {
  className?: string;
}

export function TableValue(props: TableValueProps) {
  const { className } = props;
  const column = useSelector("currentColumn");
  return <div className={className}>{column?.toString() ?? ""}</div>;
}

/**
 * Wrapper used to consume internal canvas props
 */
function ColumnWrapper(props: { children: React.ReactNode }) {
  return props.children as React.ReactElement | null;
}

export interface TableWrapperProps {
  className?: string;
  items: Array<any>;
  columns: React.ReactNode;
  size?: string;
  pagination?: boolean;
  onSelect?: (record: any) => void;
}

export function TableWrapper(props: TableWrapperProps) {
  const { className, items, columns, size, onSelect, pagination } = props;

  // Plasmic Studio Canvas currently renders items in a slightly different way than the generated code:
  // - In the studio:
  //     - The `columns` prop value is an array of nested react <Column  /> nodes.
  // - In the generated code (preview mode):
  //     - The `columns` prop value is a React Node with a `children` property that contains
  //       an array of the nested react <Column /> components.
  const tableColumns = (columns as any)?.props?.children ?? (columns as any);

  // Convert the props.columns slot children to an array of column definitions
  const columnDefinitions = React.useMemo(() => {
    return React.Children.map(
      tableColumns,
      (column: { props: TableColumnProps }, columnIndex) => {
        if (!column) {
          return undefined;
        }

        const { columnTemplate, title, dataIndex, ...rest } = column.props;

        const columnDefinition = {
          columnIndex,
          title,
          dataIndex,
          key: columnIndex,
          render: (value: any, record: any, rowIndex: any) => {
            return (
              <DataProvider name="currentRow" data={record}>
                <DataProvider name="currentRowIndex" data={rowIndex}>
                  <DataProvider name="currentColumn" data={value}>
                    {repeatedElement(
                      rowIndex,
                      <ColumnWrapper {...rest}>{columnTemplate}</ColumnWrapper>
                    )}
                  </DataProvider>
                </DataProvider>
              </DataProvider>
            );
          },
        };

        return columnDefinition;
      }
    ).filter(Boolean);
  }, [tableColumns]);

  return (
    <Table
      className={className}
      columns={columnDefinitions}
      dataSource={items}
      size={size as SizeType}
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

const DEFAULT_ITEMS = [
  {
    name: "John Brown",
    age: 19,
    address: "New York No. 1 Lake Park",
    tags: ["student", "developer"],
  },
  {
    name: "Jim Green",
    age: 42,
    address: "London No. 1 Lake Park",
    tags: ["teacher"],
  },
  {
    name: "Joe Black",
    age: 32,
    address: "Sidney No. 1 Lake Park",
    tags: ["cool", "teacher"],
  },
];

function capitalize(input: string) {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

export const tableMeta: CodeComponentMeta<TableWrapperProps> = {
  name: "AntdTable",
  displayName: "Antd Table",
  props: {
    items: {
      type: "array",
      description:
        "The data to display in the table, as a list of objects (one object per row)",
      defaultValue: DEFAULT_ITEMS,
    },

    columns: {
      type: "slot",
      allowedComponents: ["AntdTableColumn"],
      defaultValue: Object.keys(DEFAULT_ITEMS[0]).map((columnName) => ({
        type: "component",
        name: "AntdTableColumn",
        props: {
          title: capitalize(columnName),
          dataIndex: columnName,
        },
      })),
    },

    size: {
      type: "choice",
      options: ["large", "middle", "small"],
      defaultValueHint: "large",
    },

    pagination: {
      type: "boolean",
      defaultValueHint: true,
    },
  },

  importPath: "@plasmicpkgs/antd/skinny/registerTable",
  importName: "TableWrapper",
};

export const tableColumnMeta: CodeComponentMeta<TableColumnProps> = {
  name: "AntdTableColumn",
  parentComponentName: "AntdTable",
  providesData: true,
  props: {
    title: {
      type: "string",
      defaultValue: "Name",
    },

    dataIndex: {
      type: "string",
      defaultValue: "name",
      description:
        "The field to show. The table accepts some data as a list of objects, and this is the name of the field in those objects that this column will display.",
    },

    columnTemplate: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        styles: {
          padding: 0,
        },
        children: [
          {
            type: "component",
            name: "AntdTableValue",
          },
        ],
      },
    },
  },

  importPath: "@plasmicpkgs/antd/skinny/registerTable",
  importName: "TableColumn",
};

export const tableValueMeta: CodeComponentMeta<TableValueProps> = {
  name: "AntdTableValue",
  parentComponentName: "AntdTableColumn",
  props: {},
  importPath: "@plasmicpkgs/antd/skinny/registerTable",
  importName: "TableValue",
};

export function registerTable(
  loader?: Registerable,
  customMeta?: CodeComponentMeta<TableWrapperProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(TableWrapper, customMeta ?? tableMeta);
}

export function registerTableColumn(
  loader?: Registerable,
  customMeta?: CodeComponentMeta<TableColumnProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(TableColumn, customMeta ?? tableColumnMeta);
}

export function registerTableValue(
  loader?: Registerable,
  customMeta?: CodeComponentMeta<TableValueProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(TableValue, customMeta ?? tableValueMeta);
}
