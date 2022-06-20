import { repeatedElement } from "@plasmicapp/host";
import { Table } from "antd";
import L from "lodash";
import React, { ReactNode } from "react";
import { assertNever } from "../common";
import { RowContext, SupabaseQueryContext, useAllContexts } from "./Contexts";
import { getPropValue, SupabaseQuery } from "./DatabaseComponents";

export interface SupabaseFieldProps {
  className?: string;
  selector?: string;
  type: "text" | "image";
}
export function SupabaseField(props: SupabaseFieldProps) {
  const { className, selector, type } = props;
  if (type === "text") {
    return <SupabaseTextField name={selector} className={className} />;
  } else if (type === "image") {
    return <SupabaseImgField url={selector} className={className} />;
  } else {
    assertNever(type);
  }
}

export function SupabaseTextField({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  const contexts = useAllContexts();
  if (!name) {
    return <p>You need to set the name prop</p>;
  }
  return <div className={className}>{getPropValue(name, contexts)}</div>;
}

export function SupabaseImgField({
  url,
  className,
}: {
  url?: string;
  className?: string;
}) {
  const contexts = useAllContexts();
  if (!url) {
    return <p>You need to set the url prop</p>;
  }
  return (
    <img
      className={className}
      src={getPropValue(url, contexts)}
      style={{ objectFit: "cover" }}
    />
  );
}

export interface SupabaseGridProps {
  className?: string;

  // Query
  tableName?: string;
  tableColumns?: string[];
  queryFilters?: any;

  // Grid
  children?: ReactNode;
  count?: number;
  loading?: any;
}
export function SupabaseGrid(props: SupabaseGridProps) {
  const {
    className,
    tableName,
    tableColumns,
    queryFilters,
    children,
    count,
    loading,
  } = props;
  return (
    <SupabaseQuery
      tableName={tableName}
      columns={tableColumns?.join(",")}
      filters={queryFilters}
    >
      <SupabaseGridCollection
        className={className}
        count={count}
        loading={loading}
      >
        {children}
      </SupabaseGridCollection>
    </SupabaseQuery>
  );
}

export interface SupabaseGridCollectionProps {
  children?: ReactNode;
  count?: number;
  className?: string;
  loading?: any;
  testLoading?: boolean;
}

export function SupabaseGridCollection(props: SupabaseGridCollectionProps) {
  const supabaseQuery = React.useContext(SupabaseQueryContext);
  const { children, count, className, loading, testLoading } = props;

  const result = supabaseQuery;
  if (!result || testLoading) {
    return loading;
  }

  return (
    <div className={className}>
      {result.slice(0, count).map((row: any, i: any) => (
        <RowContext.Provider value={row} key={row.id}>
          <div key={row.id}>{repeatedElement(i, children)}</div>
        </RowContext.Provider>
      ))}
    </div>
  );
}

export interface SupabaseTableCollectionProps {
  children?: ReactNode;
  columns?: string;
  className?: string;
  loading?: any;
  testLoading?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  editSlot?: ReactNode;
  deleteSlot?: ReactNode;
  customizeEditAndDelete?: boolean;
  editPage?: string;
}

export function SupabaseTableCollection(props: SupabaseTableCollectionProps) {
  const supabaseQuery = React.useContext(SupabaseQueryContext);
  const {
    columns,
    className,
    loading,
    testLoading,
    canEdit,
    canDelete,
    editSlot,
    deleteSlot,
    customizeEditAndDelete,
    editPage,
  } = props;

  const result = supabaseQuery;
  if (!result || testLoading) {
    return loading;
  }

  if (!columns) {
    return <p>You need to set the columns prop</p>;
  }

  const cols = columns.split(",").map((c) => c.trim());

  const tableColumns: any = [
    ...cols.map((column) => ({
      title: L.capitalize(column),
      dataIndex: column,
      key: column,
    })),
    ...(canEdit
      ? [
          {
            title: "Edit",
            dataIndex: "edit",
            key: "edit",
            render: (id: any) => (
              <div onClick={() => console.log(id)}>
                <RowContext.Provider
                  value={result.filter((row: any) => row.id === id)[0]}
                >
                  {editSlot}
                </RowContext.Provider>
              </div>
            ),
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            title: "Delete",
            dataIndex: "delete",
            key: "delete",
            render: (id: any) => (
              <div onClick={() => console.log(id)}>
                <RowContext.Provider
                  value={result.filter((row: any) => row.id === id)[0]}
                >
                  {deleteSlot}
                </RowContext.Provider>
              </div>
            ),
          },
        ]
      : []),
  ];

  const dataSource: any = result.map((row: any) => ({
    key: result.id,
    ...cols
      .map((column) => L.pick(row, [column]))
      .flat()
      .reduce((pObj, cObj) => ({ ...pObj, ...cObj })),
    ...(canEdit ? { edit: row.id } : {}),
    ...(canDelete ? { delete: row.id } : {}),
  }));

  return (
    <div>
      {customizeEditAndDelete && (
        <div>
          {editSlot}
          {deleteSlot}
        </div>
      )}
      <Table
        dataSource={dataSource}
        columns={tableColumns}
        className={className}
        pagination={false}
      />
    </div>
  );
}
