import {
  BottomPanelButtons,
  SessionStatus,
} from "@/wab/client/components/BottomPanel";
import type { FullCodeEditor } from "@/wab/client/components/coding/FullCodeEditor";
import {
  BindingDraft,
  BindingIdentity,
  createBindingSession,
  validateBindingCode,
} from "@/wab/client/components/editor-sessions/binding-session";
import { EditorSession } from "@/wab/client/components/editor-sessions/editor-session";
import sty from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker.module.scss";
import DataPickerColumn from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerColumn";
import DataPickerGlobalSearchResultsItem from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerGlobalSearchResultsItem";
import DataPickerSelectedItem from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerSelectedItem";
import {
  Column,
  ColumnItem,
  DataPickerOpts,
  DataPickerSupportedVariableType,
  evalExpr,
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
import Button from "@/wab/client/components/widgets/Button";
import { ModalScope } from "@/wab/client/components/widgets/ModalScope";
import Searchbox from "@/wab/client/components/widgets/Searchbox";
import { TextboxRef } from "@/wab/client/components/widgets/Textbox";
import { useViewCtxMaybe } from "@/wab/client/contexts/StudioContexts";
import {
  DefaultDataPickerProps,
  PlasmicDataPicker,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicDataPicker";
import { useStudioCtxMaybe } from "@/wab/client/studio-ctx/StudioCtx";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import {
  DATA_QUERY_LOWER,
  SERVER_QUERY_LOWER,
  VARIABLE_LOWER,
} from "@/wab/shared/Labels";
import { ensure, isPrefixArray, sortBy } from "@/wab/shared/common";
import { UnwrappedQueryResult } from "@/wab/shared/core/custom-functions";
import { flattenedKeys } from "@/wab/shared/core/exprs";
import { getFlattenedStateNames } from "@/wab/shared/core/states";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { formatErrorMessage } from "@/wab/shared/error-handling";
import { pathToString } from "@/wab/shared/eval/expression-parser";
import { Component, TplNode } from "@/wab/shared/model/classes";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { head, mapValues, partition } from "lodash";
import { observer } from "mobx-react";
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

export interface DataPickerProps extends Omit<
  DefaultDataPickerProps,
  "expectedValues" | "hasExpectedValues"
> {
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
  /** Rendered as a bottom panel tab rather than as a popover. */
  docked?: boolean;
  browseOnly?: boolean;
  session?: EditorSession<BindingDraft>;
  previewTpl?: TplNode;
  previewComponent?: Component;
  forDataRepCollection?: boolean;
  target?: BindingIdentity;
  viewCtx?: ViewCtx;
  saveAndClose?: () => Promise<boolean>;
}

const DATA_PICKER_WIDTH = "70vw";
const DOCKED_ROOT_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  minWidth: 0,
};
/** Drops a node the docked picker renders in <BottomPanelButtons/> instead. */
const UNRENDERED = { render: () => null } as const;

function DataPicker_(props: DataPickerProps, ref: HTMLElementRefOf<"div">) {
  const {
    onCancel,
    data,
    schema,
    onUnlink,
    onDelete,
    hideStateSwitch,
    expectedValues,
    withAddQuery,
    onAddQuery,
    onAddVariableBtnClick,
    hidePreview,
    context,
    docked,
    browseOnly,
  } = props;
  const contextViewCtx = useViewCtxMaybe();
  const studioCtx = useStudioCtxMaybe();
  const viewCtx = props.viewCtx ?? contextViewCtx;

  const latestProps = React.useRef(props);
  latestProps.current = props;
  const [localSession] = React.useState(
    () =>
      props.session ??
      createBindingSession(
        {
          ...props,
          target: undefined,
          onChange: (value) => latestProps.current.onChange(value),
        },
        viewCtx,
        { studioCtx },
      ),
  );
  const session = props.session ?? localSession;
  const { codeEditing, code: currentCode } = session.draft;
  const setCurrentCode = (code: string) =>
    session.setDraft((previous) => ({ ...previous, code }));
  const setCodeEditing = (editing: boolean) =>
    session.setDraft((previous) => ({ ...previous, codeEditing: editing }));
  const setPath = (path: (string | number)[]) =>
    session.setDraft((previous) => ({
      ...previous,
      path,
      code: pathToString(path),
    }));
  const [query, setQuery] = React.useState("");
  const focusedTpl =
    props.previewTpl ??
    (viewCtx?.focusedTpls().length === 1
      ? head(viewCtx.focusedTpls())
      : undefined);
  const component = props.previewComponent ?? viewCtx?.currentComponent();
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
        component,
        focusedTpl,
      ),
    [data, schema, component, focusedTpl],
  );
  // fixedData unwraps `$q` with `unwrapStatefulQueryResult`, but the code
  // editor preview needs real query results so `$q.x.data` throws on error.
  const codePreviewData = React.useMemo(
    () => (fixedData && data?.$q ? { ...fixedData, $q: data.$q } : fixedData),
    [fixedData, data],
  );
  const [showAdvancedFields, setShowAdvancedFields] = React.useState(false);
  const opts: DataPickerOpts = {
    showAdvancedFields,
  };
  const dataHasAdvancedFields = React.useMemo(
    () => hasAdvancedFields(data),
    [data],
  );
  const itemsRef = React.useRef<HTMLDivElement>(null);
  const searchboxRef = React.useRef<TextboxRef>(null);
  const editorRef = React.useRef<FullCodeEditor>(null);
  const getFixedInitialColumns = (val: DataPickerValueType) =>
    getFixedInitialColumnsFor(val, opts, fixedData, component);
  const [columns, setColumns] = React.useState<Array<Column>>(() =>
    getFixedInitialColumns(session.draft.path),
  );
  const selectedItem = React.useMemo(
    () => getLastSelectedItem(columns),
    [columns],
  );
  useUpdateEffect(() => {
    setColumns(getFixedInitialColumns(session.draft.path));
  }, [showAdvancedFields, fixedData]);

  const getSearchResults = (): SearchResultItem[] => {
    if (columns.length === 0 || query === "") {
      return [];
    }
    const matcher = new Matcher(query, { matchMiddleOfWord: true });
    const searchResults: SearchResultItem[] = [];
    const createSearchResult = (
      currentColumnItems: ColumnItem[],
      newColumns: Column[],
      depth: number,
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
              ensure(fixedData, "Should only be called if data exists"),
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
              setPath(path);
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
            depth + 1,
          );
        }
      });
    };

    createSearchResult(
      columns[columns.length - 1].columnItems,
      columns.slice(0, -1),
      0,
    );

    return searchResults;
  };

  const searchResults = React.useMemo(
    () => sortBy(getSearchResults(), (x) => x.depth),
    [query, columns, fixedData, showAdvancedFields],
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
      setPath(getItemPath(curSelectedItem));
      setQuery("");
      searchboxRef.current?.focus();
    },
    [columns, showAdvancedFields],
  );

  const addQueryProps = withAddQuery &&
    onAddQuery && {
      withAddQuery,
      addQueryBtn: {
        children: `Add new ${
          DEVFLAGS.dockview ? SERVER_QUERY_LOWER : DATA_QUERY_LOWER
        }`,
        onClick: onAddQuery,
      },
    };

  const addVariableProps = onAddVariableBtnClick && {
    withAddVariable: true,
    addVariableBtn: {
      children: `Add new ${VARIABLE_LOWER}`,
      onClick: onAddVariableBtnClick,
    },
  };
  const isCodeEditing = codeEditing || (!fixedData && !props.session);
  const trySave = (code: string) => {
    setCurrentCode(code);
    return validateBindingCode(code);
  };
  const save = async () => {
    if (props.saveAndClose) {
      return props.saveAndClose();
    }
    return (await session.commit(true)).kind !== "blocked";
  };
  const runCode = () => {
    if (editorRef.current && props.onRunClick) {
      props.onRunClick(editorRef.current.getValue());
    }
  };

  const searchboxProps: React.ComponentProps<typeof Searchbox> = {
    ref: searchboxRef,
    value: query,
    onChange: (e) => setQuery(e.target.value),
    onKeyDown: (e) => {
      if (e.key === "ArrowUp") {
        onItemSelectedHandle(
          selectedItem.column,
          selectedItem.item !== undefined
            ? Math.max(selectedItem.item - 1, 0)
            : 0,
        );
      } else if (e.key === "ArrowDown") {
        onItemSelectedHandle(
          selectedItem.column,
          selectedItem.item !== undefined
            ? Math.min(
                selectedItem.item + 1,
                columns[selectedItem.column].columnItems.length - 1,
              )
            : 0,
        );
      } else if (e.key === "ArrowLeft") {
        const previousColumn = Math.max(selectedItem.column - 1, 0);
        const previousSelectedItem = columns[previousColumn].selectedItem ?? 0;
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
            const nextColumnKeys = getSupportedObjectKeys(nextColumn, opts);
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
    autoFocus: !browseOnly,
  };

  // Docked, the picker's actions live in the panel's action row, next to where the query editors
  // put theirs.
  const dockedButtons =
    docked && !browseOnly ? (
      <BottomPanelButtons>
        <Button id="data-picker-save-btn" type="primary" onClick={save}>
          Save
        </Button>
        {props.isRunCodeInteraction && isCodeEditing && (
          <Button onClick={runCode}>Run</Button>
        )}
        {onUnlink && <Button onClick={onUnlink}>Remove dynamic value</Button>}
        {onDelete && <Button onClick={onDelete}>Delete</Button>}
        <Button onClick={onCancel}>Cancel</Button>
      </BottomPanelButtons>
    ) : null;

  const sessionStatus = !props.session && <SessionStatus session={session} />;
  const rootProps = {
    props: {
      ref,
      inert: session.pending ? "" : undefined,
      "data-test-id": browseOnly ? "data-browser" : "data-picker",
      style: docked ? DOCKED_ROOT_STYLE : { width: DATA_PICKER_WIDTH },
    },
  };

  if (isCodeEditing) {
    return (
      <ModalScope
        containFocus={!docked}
        autoFocus={!browseOnly}
        style={docked ? { height: "100%" } : undefined}
      >
        {dockedButtons}
        {sessionStatus}
        <PlasmicDataPicker
          root={rootProps}
          footer={docked && !expectedValues ? UNRENDERED : undefined}
          header={
            docked ? { props: { className: sty.dockedHeader } } : undefined
          }
          withUnlink={!docked && onUnlink !== undefined}
          withDeleteButton={!docked && onDelete !== undefined}
          withoutStateSwitch={hideStateSwitch}
          stateSwitch={{
            props: {
              onClick: () => setCodeEditing(false),
            },
          }}
          unlinkButton={{ onClick: onUnlink }}
          deleteButton={docked ? UNRENDERED : { onClick: onDelete }}
          cancelButton={docked ? UNRENDERED : { onClick: onCancel }}
          saveButton={
            docked ? UNRENDERED : { id: "data-picker-save-btn", onClick: save }
          }
          runButton={docked ? UNRENDERED : { onClick: runCode }}
          copilot={!!viewCtx?.studioCtx.codeCopilotEnabled()}
          items={{ ref: itemsRef }}
          codeEditing={true}
          codeEditor={{
            editorRef: editorRef,
            data: fixedData,
            previewData: codePreviewData,
            schema,
            defaultValue: currentCode,
            onSave: trySave,
            onChange: setCurrentCode,
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
    <ModalScope
      containFocus={!docked}
      autoFocus={!browseOnly}
      style={docked ? { height: "100%" } : undefined}
    >
      {dockedButtons}
      {sessionStatus}
      <PlasmicDataPicker
        root={rootProps}
        footer={docked && !expectedValues ? UNRENDERED : undefined}
        header={docked ? { props: { className: sty.dockedHeader } } : undefined}
        title={
          docked
            ? {
                render: () => (
                  <div className={sty.dockedSearch}>
                    <Searchbox {...searchboxProps} />
                  </div>
                ),
              }
            : undefined
        }
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
        withUnlink={!docked && onUnlink !== undefined}
        withDeleteButton={!docked && onDelete !== undefined}
        empty={columns.length === 0}
        items={{ ref: itemsRef }}
        children={columns.map((colProps, idx) => {
          return (
            <DataPickerColumn
              {...colProps}
              viewCtx={viewCtx}
              data={fixedData}
              columnIndex={idx}
              isActiveColumn={idx === selectedItem.column && query == ""}
              isWide={idx >= columns.length - 2}
              key={idx}
              onItemSelected={onItemSelectedHandle}
              opts={opts}
              onCancelDataPicker={onCancel}
              docked={docked}
              allowDragging={docked && !!viewCtx}
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
                    "Unexpected undefined value after type check",
                  ),
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
        deleteButton={docked ? UNRENDERED : { onClick: onDelete }}
        cancelButton={docked ? UNRENDERED : { onClick: onCancel }}
        saveButton={
          docked ? UNRENDERED : { id: "data-picker-save-btn", onClick: save }
        }
        searchbox={docked ? UNRENDERED : searchboxProps}
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
  component: Component | undefined,
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
  component: Component | undefined,
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
  component: Component | undefined,
): ColumnItem[] {
  const keys = getSupportedObjectKeys(data, opts, undefined, []);
  // Inlined containers' members are promoted ahead of the root's own items.
  const [flattened, normal] = partition(keys, ({ key }) =>
    flattenedKeys.has(key),
  );
  return [
    ...flattened.flatMap(({ key }) =>
      key === "$q"
        ? mkQueryColumnItems(data[key], opts)
        : key === "$state"
          ? mkStateColumnItems(data[key], opts, component)
          : mkColumnItems(data[key], [key], opts),
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
  opts: DataPickerOpts,
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
  component: Component | undefined,
): ColumnItem[] {
  const flattenedStateNames = component
    ? getFlattenedStateNames(component)
    : undefined;
  const items = mkColumnItems(states, ["$state"], opts);
  const [surfaced, normal] = partition(items, (item) =>
    flattenedStateNames?.has(item.name),
  );
  return [
    ...surfaced.flatMap((stateItem) =>
      mkColumnItems(stateItem.value, getItemPath(stateItem), opts).map(
        (item) => ({
          ...item,
          label: [stateItem.name, item.label ?? item.name].join(" → "),
        }),
      ),
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
  opts: DataPickerOpts,
): Column[] {
  const selectedItem = columnItems.findIndex((item) =>
    isPrefixArray(getItemPath(item), savedPath),
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

const DataPicker = observer(React.forwardRef(DataPicker_));
export default DataPicker;

export const _testonly = {
  getCurrentItemPath,
  getFixedInitialColumnsFor,
  getInitialColumns,
};
