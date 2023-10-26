import { NormalizedData, QueryResult } from "@plasmicapp/data-sources";
import { Dropdown } from "antd";
import type { GetRowKey, SorterResult } from "antd/es/table/interface";
import fastStringify from "fast-stringify";
import React, { Key, useState } from "react";
import { BaseColumnConfig } from "./field-mappings";
import { ensure } from "./utils";

export function useSortedFilteredData(
  data: NormalizedData | undefined,
  columns: BaseColumnConfig[]
) {
  const [search, setSearch] = useState("");
  const [sortState, setSortState] = useState<
    undefined | { sorter: SorterResult<Record<string, any>> }
  >(undefined);
  const finalData = React.useMemo(() => {
    const filtered = data?.data?.filter((row) =>
      fastStringify(Object.values(row))
        .toLowerCase()
        .includes(search.toLowerCase())
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

export type RowAction = RowActionItem | RowActionMenu;

export function tagDataArray(xs: object[]) {
  return xs.map((x: object, i) => ({ ...x, __tag: i + 1 }));
}

export function getTag(x: unknown) {
  return (x as any).__tag;
}

/**
 * Don't want to simply return undefined, we prefer always having *some* row key so that users can always (say) click on things without needing to explicitly set a row key.
 */
export function deriveRowKey(
  _data: QueryResult | undefined,
  rowKey: string | GetRowKey<Record<any, any>> | undefined
) {
  if (rowKey) {
    return rowKey;
  }
  // Use the index by default.
  return (x: unknown) => {
    return ensure(getTag(x));
  };
}

export function deriveKeyOfRow(
  row: any,
  rowKey: string | GetRowKey<any> | undefined
) {
  if (typeof rowKey === "function") {
    return rowKey(row);
  } else if (typeof rowKey === "string") {
    return row[rowKey];
  } else {
    return undefined;
  }
}

export function renderActions(
  rowActions: RowAction[],
  row: any,
  data: NormalizedData | undefined,
  rowKey: string | ((record: any, index?: number) => Key) | undefined
) {
  return rowActions.map((_action) => {
    if (_action.type === "item") {
      return (
        <a
          key={_action.label}
          style={{
            whiteSpace: "nowrap",
          }}
          onClick={() =>
            _action.onClick?.(
              deriveKeyOfRow(row, deriveRowKey(data, rowKey)),
              row
            )
          }
        >
          {_action.label}
        </a>
      );
    } else {
      return (
        <Dropdown
          key={_action.label}
          menu={{
            items: (_action.children ?? []).map((child) => ({
              key: child.label,
              label: child.label,
              onClick: () =>
                child.onClick?.(
                  deriveKeyOfRow(row, deriveRowKey(data, rowKey)),
                  row
                ),
            })),
          }}
        >
          <a
            href={"javascript: void 0"}
            style={{
              whiteSpace: "nowrap",
            }}
          >
            {_action.label}
          </a>
        </Dropdown>
      );
    }
  });
}
