import type { FullCodeEditor } from "@/wab/client/components/coding/FullCodeEditor";
import {
  checkDisallowedUseOfLibs,
  checkStrSizeLimit,
  checkSyntaxError,
  checkWindowGlobalUsage,
} from "@/wab/client/components/sidebar-tabs/ComponentProps/CodeEditor";
import DataPickerColumn from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerColumn";
import DataPickerGlobalSearchResultsItem from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerGlobalSearchResultsItem";
import DataPickerSelectedItem from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerSelectedItem";
import {
  Column,
  ColumnItem,
  DataPickerOpts,
  DataPickerSupportedVariableType,
  evalExpr,
  formatErrorMessage,
  getItemChildColumns,
  getItemPath,
  getSupportedObjectKeys,
  getVariableType,
  hasAdvancedFields,
  isListType,
  isTypeSupported,
  mkColumnItems,
  prepareEnvForDataPicker,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerUtil";
import { Matcher } from "@/wab/client/components/view-common";
import { ModalScope } from "@/wab/client/components/widgets/ModalScope";
import { TextboxRef } from "@/wab/client/components/widgets/Textbox";
import { useViewCtxMaybe } from "@/wab/client/contexts/StudioContexts";
import {
  DefaultDataPickerProps,
  PlasmicDataPicker,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicDataPicker";
import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import { DATA_QUERY_LOWER, VARIABLE_LOWER } from "@/wab/shared/Labels";
import { ensure, isPrefixArray, sortBy } from "@/wab/shared/common";
import { UnwrappedQueryResult } from "@/wab/shared/core/custom-functions";
import { flattenedKeys } from "@/wab/shared/core/exprs";
import { getFlattenedStateNames } from "@/wab/shared/core/states";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  pathToString,
  transformDataTokenPathToBundle,
  transformDataTokenPathToDisplay,
  transformDataTokensInCode,
  transformDataTokensToDisplay,
} from "@/wab/shared/eval/expression-parser";
import { Component, Interaction } from "@/wab/shared/model/classes";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { head, mapValues, partition } from "lodash";
import * as React from "react";
import { useUpdateEffect } from "react-use";

type SelectedItem = {
  column: number;
  item: number | undefined;
};

type SearchResultItem = {
  itemPath: (string | number)[];
  previewValue: string | undefined;
  variableType: DataPickerSupportedVariableType;
  matcher: Matcher;
  onClick: () => void;
  depth: number;
};

export type InitialMode = "codeEditing" | "dataPicking";

type DataPickerValueType = (string | number)[] | string | null | undefined;

export const extraTsFilesSymbol = Symbol("plasmicExtraTsFiles");

export interface DataPickerTypesSchema {
  [extraFile: symbol]: {
    fileName: string;
    contents: string;
  }[];
  [key: string]: string;
}

export const DataPickerRunCodeActionContext = React.createContext<
  | {
      interaction: Interaction;
      stepValue: any;
    }
  | undefined
>(undefined);

export interface DataPickerProps
  extends Omit<DefaultDataPickerProps, "expectedValues" | "hasExpectedValues"> {
  value: DataPickerValueType;
  onChange: (value: DataPickerValueType) => void;
  onCancel: () => void;
  data?: Record<string, any>;
  schema?: DataPickerTypesSchema;
  onUnlink?: () => void;
  onDelete?: () => void;
  hideStateSwitch?: boolean;
  expectedValues?: string;
  initialMode?: InitialMode;
  onAddQuery?: () => void;
  onAddVariableBtnClick?: () => void;
  hidePreview?: boolean;
  // A brief description of what the expression is supposed to be used for
  context?: string;
  onRunClick?: (value: string) => void;
}

const DATA_PICKER_WIDTH = "70vw";

function DataPicker_(props: DataPickerProps, ref: HTMLElementRefOf<"div">) {
  const {
    value,
    onChange,
    onCancel,
    data,
    schema,
    onUnlink,
    onDelete,
    hideStateSwitch,
    expectedValues,
    initialMode = "dataPicking",
    withAddQuery,
    onAddQuery,
    onAddVariableBtnClick,
    hidePreview,
    context,
  } = props;
  const viewCtx = useViewCtxMaybe();

  // Transform value from storage format to display format for DataPicker UI
  const displayValue = React.useMemo(() => {
    if (!value || !viewCtx) {
      return value;
    }
    if (typeof value === "string") {
      return transformDataTokensToDisplay(
        value,
        viewCtx.site,
        viewCtx.siteInfo.id
      );
    }
    return transformDataTokenPathToDisplay(
      value,
      viewCtx.site,
      viewCtx.siteInfo.id
    );
  }, [value, viewCtx?.site, viewCtx?.siteInfo]);

  const [codeEditing, setCodeEditing] = React.useState(
    !displayValue
      ? initialMode === "codeEditing"
      : typeof displayValue === "string"
  );
  const [query, setQuery] = React.useState("");
  const [draft, setDraft] = React.useState<string | undefined>(
    typeof displayValue === "string"
      ? displayValue
      : displayValue && typeof displayValue === "object"
      ? pathToString(displayValue)
      : undefined
  );
  const focusedTpl =
    viewCtx?.focusedTpls().length === 1
      ? head(viewCtx.focusedTpls())
      : undefined;
  const fixedData = React.useMemo(
    // If schema is given, then include schema, mapped to undefined, in the
    // data env, even if it's not present in `data`
    () =>
      prepareEnvForDataPicker(
        viewCtx,
        {
          ...(schema ? mapValues(schema, () => undefined) : undefined),
          ...data,
        },
        viewCtx?.currentComponent(),
        focusedTpl
      ),
    [data, schema, viewCtx?.currentComponent(), focusedTpl]
  );
  // fixedData unwraps `$q` with `unwrapStatefulQueryResult`, but the code
  // editor preview needs real query results so `$q.x.data` throws on error.
  const codePreviewData = React.useMemo(
    () => (fixedData && data?.$q ? { ...fixedData, $q: data.$q } : fixedData),
    [fixedData, data]
  );
  const [showAdvancedFields, setShowAdvancedFields] = React.useState(false);
  const opts: DataPickerOpts = {
    showAdvancedFields,
  };
  const dataHasAdvancedFields = React.useMemo(
    () => hasAdvancedFields(data),
    [data]
  );
  const itemsRef = React.useRef<HTMLDivElement>(null);
  const searchboxRef = React.useRef<TextboxRef>(null);
  const editorRef = React.useRef<FullCodeEditor>(null);
  const getFixedInitialColumns = (val: DataPickerValueType) =>
    getFixedInitialColumnsFor(val, opts, fixedData, viewCtx?.component);
  const [columns, setColumns] = React.useState<Array<Column>>(() =>
    getFixedInitialColumns(displayValue)
  );
  const selectedItem = React.useMemo(
    () => getLastSelectedItem(columns),
    [columns]
  );
  const currentItemPath = React.useMemo(
    () => getCurrentItemPath(columns),
    [columns]
  );
  useUpdateEffect(() => {
    setColumns(getFixedInitialColumns(currentItemPath));
  }, [showAdvancedFields]);

  const getSearchResults = (): SearchResultItem[] => {
    if (columns.length === 0 || query === "") {
      return [];
    }
    const matcher = new Matcher(query, { matchMiddleOfWord: true });
    const searchResults: SearchResultItem[] = [];
    const createSearchResult = (
      currentColumnItems: ColumnItem[],
      newColumns: Column[],
      depth: number
    ) => {
      currentColumnItems.forEach((item, index) => {
        const path = getItemPath(item);
        const val = item.value;
        const variableType = getVariableType(val);
        if (!isTypeSupported(variableType)) {
          return;
        }
        const keyCount = isListType(variableType)
          ? getSupportedObjectKeys(val, opts).length
          : 0;
        const nextColumns = isListType(variableType)
          ? mkColumnItems(val, path, opts)
          : [];
        const previewValue = !isListType(variableType)
          ? evalExpr(
              path,
              ensure(fixedData, "Should only be called if data exists")
            )
          : keyCount + ` item${keyCount === 1 ? "" : "s"}`;

        // The join matches the format used in DataPickerGlobalSearchResultsItem
        if (matcher.matches(path.join(" / "))) {
          searchResults.push({
            itemPath: path,
            previewValue: previewValue,
            variableType: variableType,
            matcher: matcher,
            onClick: () => {
              setQuery("");
              setDraft(pathToString(path));
              setColumns([
                ...newColumns,
                {
                  selectedItem: index,
                  columnItems: currentColumnItems,
                },
                ...(isListType(variableType)
                  ? [
                      {
                        selectedItem: undefined,
                        columnItems: nextColumns,
                      },
                    ]
                  : []),
              ]);
            },
            depth,
          });
        }
        if (isListType(variableType)) {
          createSearchResult(
            nextColumns,
            newColumns.concat({
              selectedItem: index,
              columnItems: currentColumnItems,
            }),
            depth + 1
          );
        }
      });
    };

    createSearchResult(
      columns[columns.length - 1].columnItems,
      columns.slice(0, -1),
      0
    );

    return searchResults;
  };

  const searchResults = React.useMemo(
    () => sortBy(getSearchResults(), (x) => x.depth),
    [query, data]
  );

  const onItemSelectedHandle = React.useCallback(
    (column: number, item: number) => {
      const oldColumns = columns.slice(0, column + 1);
      oldColumns[column].selectedItem = item;
      const curSelectedItem = oldColumns[column].columnItems[item];
      setColumns([
        ...oldColumns,
        ...getItemChildColumns(curSelectedItem, opts),
      ]);
      setDraft(pathToString(getItemPath(curSelectedItem)));
      setQuery("");
      searchboxRef.current?.focus();
    },
    [columns]
  );

  const addQueryProps =
    withAddQuery && onAddQuery
      ? {
          withAddQuery,
          addQueryBtn: {
            children: `Add new ${DATA_QUERY_LOWER}`,
            onClick: () => onAddQuery(),
          },
        }
      : {};

  const addVariableProps = onAddVariableBtnClick
    ? {
        withAddVariable: true,
        addVariableBtn: {
          children: `Add new ${VARIABLE_LOWER}`,
          onClick: () => onAddVariableBtnClick(),
        },
      }
    : {};
  if (codeEditing || !fixedData) {
    const stringValue =
      typeof displayValue === "object" && displayValue
        ? pathToString(displayValue)
        : displayValue;

    const trySave = (val: string) => {
      if (!checkStrSizeLimit(val)) {
        return false;
      }

      if (!checkSyntaxError(val)) {
        return false;
      }

      if (!checkDisallowedUseOfLibs(val)) {
        return false;
      }

      checkWindowGlobalUsage(val);

      setDraft(val);
      return true;
    };
    return (
      <ModalScope>
        <PlasmicDataPicker
          root={{
            props: {
              ref,
              "data-test-id": "data-picker",
              style: {
                width: DATA_PICKER_WIDTH,
              },
            },
          }}
          withUnlink={onUnlink !== undefined}
          withDeleteButton={onDelete !== undefined}
          withoutStateSwitch={hideStateSwitch}
          stateSwitch={{
            props: {
              onClick: () => setCodeEditing(false),
            },
          }}
          unlinkButton={{ onClick: onUnlink }}
          deleteButton={{ onClick: onDelete }}
          cancelButton={{
            onClick: () => {
              setDraft(undefined);
              onCancel();
            },
          }}
          saveButton={{
            onClick: () => {
              if (editorRef.current && trySave(editorRef.current.getValue())) {
                const code = editorRef.current.getValue();
                // Transform data tokens from display format to storage format.
                const transformedCode = viewCtx
                  ? transformDataTokensInCode(
                      code,
                      viewCtx.site,
                      viewCtx.studioCtx.siteInfo.id
                    ).code
                  : code;
                onChange(transformedCode);
              }
            },
          }}
          runButton={{
            onClick: () => {
              if (editorRef.current && props.onRunClick) {
                props.onRunClick(editorRef.current.getValue());
              }
            },
          }}
          copilot={DEVFLAGS.showCopilot && !!viewCtx}
          items={{ ref: itemsRef }}
          codeEditing={true}
          codeEditor={{
            editorRef: editorRef,
            data: fixedData,
            previewData: codePreviewData,
            schema,
            defaultValue: draft ?? stringValue ?? "",
            onSave: trySave,
            hidePreview,
            context,
          }}
          hasExpectedValues={!!expectedValues}
          expectedValues={
            expectedValues ? (
              <StandardMarkdown components={{ p: "span" }}>
                {expectedValues}
              </StandardMarkdown>
            ) : undefined
          }
          {...addQueryProps}
          isRunCodeInteraction={props.isRunCodeInteraction}
        />
      </ModalScope>
    );
  }

  return (
    <ModalScope>
      <PlasmicDataPicker
        root={{
          props: {
            ref,
            "data-test-id": "data-picker",
            style: {
              width: DATA_PICKER_WIDTH,
            },
          },
        }}
        advancedToggle={
          !dataHasAdvancedFields
            ? undefined
            : showAdvancedFields
            ? "hide"
            : "show"
        }
        advancedSwitch={{
          onClick: (e) => {
            e.preventDefault();
            setShowAdvancedFields(!showAdvancedFields);
          },
        }}
        withUnlink={onUnlink !== undefined}
        withDeleteButton={onDelete !== undefined}
        empty={columns.length === 0}
        items={{ ref: itemsRef }}
        children={columns.map((colProps, idx) => {
          return (
            <DataPickerColumn
              {...colProps}
              data={fixedData}
              columnIndex={idx}
              isActiveColumn={idx === selectedItem.column && query == ""}
              isWide={idx >= columns.length - 2}
              key={idx}
              onItemSelected={onItemSelectedHandle}
              opts={opts}
              onCancelDataPicker={onCancel}
            />
          );
        })}
        selectedItem={columns.map((_props, idx) => {
          if (_props.selectedItem === undefined) {
            return undefined;
          }
          const columnItem = _props.columnItems[_props.selectedItem];
          return (
            <DataPickerSelectedItem
              itemName={columnItem.label ?? columnItem.name}
              onClick={() => {
                onItemSelectedHandle(
                  idx,
                  ensure(
                    _props.selectedItem,
                    "Unexpected undefined value after type check"
                  )
                );
              }}
              key={idx}
              lastItem={idx === selectedItem?.column}
            />
          );
        })}
        withoutStateSwitch={hideStateSwitch}
        stateSwitch={{
          props: {
            onClick: () => setCodeEditing(true),
          },
        }}
        unlinkButton={{ onClick: onUnlink }}
        deleteButton={{ onClick: onDelete }}
        cancelButton={{ onClick: onCancel }}
        saveButton={{
          id: "data-picker-save-btn",
          onClick: () => {
            let savedPath = currentItemPath;
            if (viewCtx) {
              savedPath = transformDataTokenPathToBundle(
                savedPath,
                viewCtx.site,
                viewCtx.siteInfo.id
              );
            }
            onChange(savedPath);
          },
        }}
        searchbox={{
          ref: searchboxRef,
          value: query,
          onChange: (e) => setQuery(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "ArrowUp") {
              onItemSelectedHandle(
                selectedItem.column,
                selectedItem.item !== undefined
                  ? Math.max(selectedItem.item - 1, 0)
                  : 0
              );
            } else if (e.key === "ArrowDown") {
              onItemSelectedHandle(
                selectedItem.column,
                selectedItem.item !== undefined
                  ? Math.min(
                      selectedItem.item + 1,
                      columns[selectedItem.column].columnItems.length - 1
                    )
                  : 0
              );
            } else if (e.key === "ArrowLeft") {
              const previousColumn = Math.max(selectedItem.column - 1, 0);
              const previousSelectedItem =
                columns[previousColumn].selectedItem ?? 0;
              onItemSelectedHandle(previousColumn, previousSelectedItem);
            } else if (e.key === "ArrowRight") {
              if (selectedItem.item === undefined) {
                onItemSelectedHandle(selectedItem.column, 0);
              } else {
                const selItem =
                  columns[selectedItem.column].columnItems[selectedItem.item];
                const nextColumn = selItem.value;
                const variableType = getVariableType(nextColumn);
                if (isListType(variableType)) {
                  const nextColumnKeys = getSupportedObjectKeys(
                    nextColumn,
                    opts
                  );
                  if (nextColumnKeys.length !== 0) {
                    onItemSelectedHandle(selectedItem.column + 1, 0);
                  }
                }
              }
            } else if (e.key === "Enter") {
              setQuery("");
            } else if (e.key === "Escape") {
              onCancel();
            } else {
              return;
            }
            e.preventDefault();
          },
          noOutline: true,
          autoFocus: true,
        }}
        withSearchResult={query !== ""}
        searchResults={{
          ref: (_) => itemsRef.current?.scrollTo({ left: 10000 }),
          children: searchResults.map((_props, idx) => {
            return <DataPickerGlobalSearchResultsItem {..._props} key={idx} />;
          }),
        }}
        hasExpectedValues={!!expectedValues}
        expectedValues={expectedValues}
        {...addQueryProps}
        {...addVariableProps}
        isRunCodeInteraction={props.isRunCodeInteraction}
      />
    </ModalScope>
  );
}

/**
 * Builds the initial columns then reverses column 0's items (and remaps its
 * `selectedItem`) to match how the top-level column is rendered.
 */
function getFixedInitialColumnsFor(
  value: DataPickerValueType,
  opts: DataPickerOpts,
  data: Record<string, any> | undefined,
  component: Component | undefined
): Column[] {
  const initialColumns = getInitialColumns(value, opts, data, component);
  const [firstColumn] = initialColumns;
  if (firstColumn) {
    const { columnItems, selectedItem } = firstColumn;
    columnItems.reverse();
    firstColumn.selectedItem =
      selectedItem === undefined
        ? undefined
        : columnItems.length - selectedItem - 1;
  }
  return initialColumns;
}

function getInitialColumns(
  value: DataPickerValueType,
  opts: DataPickerOpts,
  data: Record<string, any> | undefined,
  component: Component | undefined
): Column[] {
  if (!data) {
    return [];
  }
  // A non-array `value` (string code, null) means no current selection.
  let savedPath: (string | number)[] =
    !value || typeof value === "string" ? [] : value;
  // Older exprs may reference `$q.<name>` directly; its picker row is `$q.<name>.data`.
  if (savedPath.length === 2 && savedPath[0] === "$q") {
    savedPath = [...savedPath, "data"];
  }
  const rootItems = mkRootColumnItems(data, opts, component);
  if (rootItems.length === 0) {
    return [];
  }
  return walkColumns(rootItems, savedPath, opts);
}

/**
 * The picker's first column, and the only level aware of different kinds of data.
 * `$`-containers are inlined, `$q` queries become their `.data` item (carrying any error),
 * and `$state` surfaces named component implicit states. Everything below is built generically.
 */
function mkRootColumnItems(
  data: Record<string, any>,
  opts: DataPickerOpts,
  component: Component | undefined
): ColumnItem[] {
  const keys = getSupportedObjectKeys(data, opts, undefined, []);
  // Inlined containers' members are promoted ahead of the root's own items.
  const [flattened, normal] = partition(keys, ({ key }) =>
    flattenedKeys.has(key)
  );
  return [
    ...flattened.flatMap(({ key }) =>
      key === "$q"
        ? mkQueryColumnItems(data[key], opts)
        : key === "$state"
        ? mkStateColumnItems(data[key], opts, component)
        : mkColumnItems(data[key], [key], opts)
    ),
    ...normal.map(({ key, label }) => ({
      name: key,
      label,
      value: data[key],
      pathPrefix: [],
    })),
  ];
}

/** Special case for $q: each query's root column item is `$q.<name>.data` */
function mkQueryColumnItems(
  queries: Record<string, any>,
  opts: DataPickerOpts
): ColumnItem[] {
  return mkColumnItems(queries, ["$q"], opts).map((item) => {
    const query = item.value as UnwrappedQueryResult;
    return {
      name: "data",
      label: item.label ?? item.name,
      value: query?.data,
      pathPrefix: ["$q", item.name],
      errorMessage:
        query?.error !== undefined
          ? formatErrorMessage(query.error)
          : undefined,
    };
  });
}

/**
 * Items for `$state`, where the implicit states of `component`'s named tpl nodes
 * are inlined one more level with a `comp → member` label so the hidden component
 * name stays visible.
 */
function mkStateColumnItems(
  states: Record<string, any>,
  opts: DataPickerOpts,
  component: Component | undefined
): ColumnItem[] {
  const flattenedStateNames = component
    ? getFlattenedStateNames(component)
    : undefined;
  const items = mkColumnItems(states, ["$state"], opts);
  const [surfaced, normal] = partition(items, (item) =>
    flattenedStateNames?.has(item.name)
  );
  return [
    ...surfaced.flatMap((stateItem) =>
      mkColumnItems(stateItem.value, getItemPath(stateItem), opts).map(
        (item) => ({
          ...item,
          label: [stateItem.name, item.label ?? item.name].join(" → "),
        })
      )
    ),
    ...normal,
  ];
}

/**
 * Walks `savedPath` one column at a time. Each column selects the item whose path
 * is a prefix of `savedPath`, then descends into that item's child column and continues.
 * Inlined containers (`$state`, $q's `.data`, etc.) are absorbed by the root items
 * themselves, so this stays a uniform prefix match at every level.
 */
function walkColumns(
  columnItems: ColumnItem[],
  savedPath: (string | number)[],
  opts: DataPickerOpts
): Column[] {
  const selectedItem = columnItems.findIndex((item) =>
    isPrefixArray(getItemPath(item), savedPath)
  );
  const column: Column = {
    columnItems,
    selectedItem: selectedItem === -1 ? undefined : selectedItem,
  };
  if (selectedItem === -1) {
    return [column];
  }
  const item = columnItems[selectedItem];
  const selectedPath = getItemPath(item);
  const childColumns = getItemChildColumns(item, opts);
  const [childColumn] = childColumns;
  if (!childColumn) {
    return [column];
  }
  // Recurse into the child column only when the saved path continues past this item and
  // the child is a real list. Otherwise show the child column with nothing selected.
  return savedPath.length > selectedPath.length &&
    childColumn.errorMessage === undefined
    ? [column, ...walkColumns(childColumn.columnItems, savedPath, opts)]
    : [column, ...childColumns];
}

function getLastSelectedItem(columns: Column[]): SelectedItem {
  for (let i = columns.length - 1; i >= 0; i--) {
    const currentSelectedItem = columns[i].selectedItem;
    if (currentSelectedItem !== undefined) {
      return {
        column: i,
        item: currentSelectedItem,
      };
    }
  }
  return {
    column: 0,
    item: undefined,
  };
}

function getCurrentItemPath(columns: Column[]): (string | number)[] {
  for (let i = columns.length - 1; i >= 0; i--) {
    if (columns[i].selectedItem === undefined) {
      continue;
    }
    const selectedItem =
      columns[i].columnItems[
        ensure(columns[i].selectedItem, "Should have item selected in column")
      ];
    return getItemPath(selectedItem);
  }
  return ["undefined"];
}

const DataPicker = React.forwardRef(DataPicker_);
export default DataPicker;

export const _testonly = {
  getCurrentItemPath,
  getFixedInitialColumnsFor,
  getInitialColumns,
};
