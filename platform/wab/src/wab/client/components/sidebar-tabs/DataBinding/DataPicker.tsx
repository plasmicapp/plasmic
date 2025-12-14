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
  ColumnItem,
  DataPickerOpts,
  evalExpr,
  getItemPath,
  getSupportedObjectKeys,
  getVariableType,
  hasAdvancedFields,
  isListType,
  isTypeSupported,
  mkColumnItems,
  parseItem,
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
import { PlasmicDataPickerColumnItem__VariantMembers } from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicDataPickerColumnItem";
import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import { DATA_QUERY_LOWER, VARIABLE_LOWER } from "@/wab/shared/Labels";
import { arrayEq, ensure, isPrefixArray, sortBy } from "@/wab/shared/common";
import { flattenedKeys } from "@/wab/shared/core/exprs";
import { getKeysToFlatForDollarState } from "@/wab/shared/core/states";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { pathToString } from "@/wab/shared/eval/expression-parser";
import { Interaction } from "@/wab/shared/model/classes";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { head, mapValues } from "lodash";
import deepGet from "lodash/get";
import * as React from "react";
import { useUpdateEffect } from "react-use";

type Column = {
  selectedItem: number | undefined;
  columnItems: ColumnItem[];
};

type SelectedItem = {
  column: number;
  item: number | undefined;
};

type SearchResultItem = {
  itemPath: (string | number)[];
  previewValue: string | undefined;
  variableType: PlasmicDataPickerColumnItem__VariantMembers["variableType"];
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
  flatten?: boolean;
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
    flatten = true,
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
  const extraObjectPathsToFlatten =
    flatten && viewCtx?.component
      ? getKeysToFlatForDollarState(viewCtx.component)
      : undefined;
  const [codeEditing, setCodeEditing] = React.useState(
    !value ? initialMode === "codeEditing" : typeof value === "string"
  );
  const [query, setQuery] = React.useState("");
  const [draft, setDraft] = React.useState<string | undefined>(
    typeof value === "string"
      ? value
      : typeof value === "object" && value
      ? pathToString(value)
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
  const getFixedInitialColumns = (val: DataPickerValueType) => {
    const initialColumns = getInitialColumns(
      val,
      opts,
      fixedData,
      flatten,
      extraObjectPathsToFlatten
    );
    if (initialColumns.length >= 1) {
      const len = initialColumns[0].columnItems.length;
      const item = initialColumns[0].selectedItem;
      initialColumns[0].columnItems.reverse();
      initialColumns[0].selectedItem =
        item !== undefined ? len - item - 1 : undefined;
    }
    return initialColumns;
  };
  const [columns, setColumns] = React.useState<Array<Column>>(() =>
    getFixedInitialColumns(value)
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
      currentColumnItems.forEach(
        ({ name: key, value: val, pathPrefix }, index) => {
          const itemPath = getItemPath(pathPrefix, key);
          const variableType = getVariableType(val);
          if (!isTypeSupported(variableType)) {
            return;
          }
          const keyCount = isListType(variableType)
            ? getSupportedObjectKeys(val, opts).length
            : 0;
          const nextColumns = isListType(variableType)
            ? mkColumnItems(val, itemPath, opts)
            : [];
          const previewValue = !isListType(variableType)
            ? evalExpr(
                itemPath,
                ensure(fixedData, "Should only be called if data exists")
              )
            : keyCount + ` item${keyCount === 1 ? "" : "s"}`;

          // The join matches the format used in DataPickerGlobalSearchResultsItem
          if (matcher.matches(itemPath.join(" / "))) {
            searchResults.push({
              itemPath: itemPath,
              previewValue: previewValue,
              variableType: variableType,
              matcher: matcher,
              onClick: () => {
                setQuery("");
                setDraft(pathToString(itemPath));
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
        }
      );
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
      const selectedItemValue = curSelectedItem.value;
      const selectedPath = getItemPath(
        curSelectedItem.pathPrefix,
        curSelectedItem.name
      );
      const variableType = getVariableType(selectedItemValue);
      const newColumn: Column[] =
        isListType(variableType) &&
        getSupportedObjectKeys(selectedItemValue, opts).length > 0
          ? [
              {
                selectedItem: undefined,
                columnItems: mkColumnItems(
                  selectedItemValue,
                  selectedPath,
                  opts
                ),
              },
            ]
          : [];

      setColumns([...oldColumns, ...newColumn]);
      setDraft(pathToString(selectedPath));
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
      typeof value === "object" && value ? pathToString(value) : value;

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
                onChange(editorRef.current.getValue());
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
        children={columns.map((_props, idx) => {
          return (
            <DataPickerColumn
              {..._props}
              data={fixedData}
              columnIndex={idx}
              isActiveColumn={idx === selectedItem.column && query == ""}
              isWide={idx >= columns.length - 2}
              key={idx}
              onItemSelected={onItemSelectedHandle}
              opts={opts}
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
            onChange(currentItemPath);
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
                const variableType = getVariableType(
                  columns[selectedItem.column].columnItems[selectedItem.item]
                    .value
                );
                if (isListType(variableType)) {
                  const nextColumn =
                    columns[selectedItem.column].columnItems[selectedItem.item]
                      .value;
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
            return (
              <DataPickerGlobalSearchResultsItem
                {..._props}
                key={idx}
                flatten={flatten}
              />
            );
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

function getInitialColumns(
  value: (string | number)[] | string | null | undefined,
  opts: DataPickerOpts,
  data?: Record<string, any>,
  flatten?: boolean,
  extraObjectPathsToFlat?: (string | number)[][]
): Column[] {
  if (!data) {
    return [];
  }
  if (!value || typeof value === "string" || value.length === 0) {
    const objectKeys = getSupportedObjectKeys(data, opts);
    if (objectKeys.length === 0) {
      return [];
    }
    return [
      {
        selectedItem: undefined,
        columnItems: mkColumnItems(
          data,
          [],
          opts,
          flatten,
          extraObjectPathsToFlat
        ),
      },
    ];
  }

  if (value.length === 1) {
    const objectKeys = getSupportedObjectKeys(data, opts);
    if (objectKeys.length === 0) {
      return [];
    }
    const columnItems = mkColumnItems(
      data,
      [],
      opts,
      flatten,
      extraObjectPathsToFlat
    );
    let selectedItem: number | undefined = undefined;
    if (
      !flatten ||
      !flattenedKeys.has(value[0].toString()) ||
      extraObjectPathsToFlat?.some((objPath) => isPrefixArray(value, objPath))
    ) {
      selectedItem = columnItems.findIndex(
        (item) => item.name === value[0].toString()
      );
      selectedItem = selectedItem !== -1 ? selectedItem : undefined;
    }
    const variableType = getVariableType(
      selectedItem !== undefined ? columnItems[selectedItem].value : undefined
    );
    return [
      {
        columnItems: columnItems,
        selectedItem: selectedItem,
      },
      ...(isListType(variableType) && selectedItem !== undefined
        ? [
            {
              columnItems: mkColumnItems(
                columnItems[selectedItem].value,
                getItemPath(
                  columnItems[selectedItem].pathPrefix,
                  columnItems[selectedItem].name
                ),
                opts
              ),
              selectedItem: undefined,
            },
          ]
        : []),
    ];
  }

  const createInitialColumns = (
    currentNode: Record<string, any>,
    pathPrefix: (string | number)[]
  ): Column[] => {
    const index = pathPrefix.length;
    if (index >= value.length) {
      const objectKeys = getSupportedObjectKeys(
        currentNode,
        opts,
        undefined,
        pathPrefix
      );
      if (objectKeys.length === 0) {
        return [];
      }
      const columnItems = mkColumnItems(currentNode, pathPrefix, opts);
      return [
        {
          columnItems: columnItems,
          selectedItem: undefined,
        },
      ];
    }

    if (flatten && index === 0) {
      const key = value[index].toString();
      const columnItems = mkColumnItems(
        currentNode,
        [],
        opts,
        flatten,
        extraObjectPathsToFlat
      );
      let realKey = key;
      let prefix = pathPrefix;
      let idx = index;
      while (
        flattenedKeys.has(realKey) ||
        extraObjectPathsToFlat?.some((objPath) =>
          isPrefixArray([...prefix, realKey], objPath)
        )
      ) {
        prefix = [...prefix, realKey];
        realKey = value[idx + 1].toString();
        idx = idx + 1;
      }
      const selectedItem = columnItems.findIndex(
        (x) => x.name === realKey && arrayEq(x.pathPrefix, prefix)
      );
      if (selectedItem === -1) {
        return columnItems.length > 0
          ? [
              {
                columnItems: columnItems,
                selectedItem: undefined,
              },
            ]
          : [];
      }

      const itemPath = key !== realKey ? getItemPath(prefix, realKey) : [key];
      const variableType = getVariableType(columnItems[selectedItem].value);
      return [
        {
          columnItems: columnItems,
          selectedItem: selectedItem !== -1 ? selectedItem : undefined,
        },
        ...(isListType(variableType)
          ? createInitialColumns(
              key !== realKey
                ? deepGet(currentNode, itemPath)
                : currentNode[key],
              itemPath
            )
          : []),
      ];
    }
    const key = value[index].toString();
    const children = getSupportedObjectKeys(
      currentNode,
      opts,
      undefined,
      pathPrefix
    );
    const selectedItem = children.findIndex((x) => x.key === key);
    const itemPath = getItemPath(pathPrefix, key);
    const variableType = getVariableType(currentNode[key]);

    return [
      {
        columnItems: mkColumnItems(currentNode, pathPrefix, opts),
        selectedItem: selectedItem !== -1 ? selectedItem : undefined,
      },
      ...(isListType(variableType)
        ? createInitialColumns(currentNode[key], itemPath)
        : []),
    ];
  };

  return createInitialColumns(data, []);
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
    return [...selectedItem.pathPrefix, parseItem(selectedItem.name)];
  }
  return ["undefined"];
}

const DataPicker = React.forwardRef(DataPicker_);
export default DataPicker;
