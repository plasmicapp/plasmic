import { ContextMenuContext } from "@/wab/client/components/ContextMenuIndicator/ContextMenuIndicator";
import CopilotCodePrompt from "@/wab/client/components/CopilotCodePrompt";
import { resetNodes as doResetNodes } from "@/wab/client/components/canvas/slate";
import styles from "@/wab/client/components/sidebar-tabs/ComponentProps/TemplatedTextEditor.module.scss";
import DataPicker, {
  DataPickerTypesSchema,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { PropEditorRef } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { useSignalListener } from "@/wab/commons/components/use-signal-listener";
import { DropFirst } from "@/wab/commons/types";
import {
  arrayEqIgnoreOrder,
  cx,
  delay,
  randUint16,
  spawn,
  xSetDefault,
} from "@/wab/shared/common";
import {
  ExprCtx,
  asCode,
  clone,
  codeLit,
  createExprForDataPickerValue,
  customCode,
  extractValueSavedFromDataPicker,
  isRealCodeExpr,
  summarizeExpr,
} from "@/wab/shared/core/exprs";
import {
  getDynamicBindings,
  isDynamicValue,
} from "@/wab/shared/dynamic-bindings";
import { tryEvalExpr } from "@/wab/shared/eval";
import {
  Component,
  CustomCode,
  ObjectPath,
  TemplatedString,
  isKnownCustomCode,
  isKnownObjectPath,
} from "@/wab/shared/model/classes";
import { DataSourceSchema } from "@plasmicapp/data-sources";
import { Popover, Tooltip } from "antd";
import { debounce } from "lodash";
import isEqual from "lodash/isEqual";
import memoizeOne from "memoize-one";
import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
import { usePrevious } from "react-use";
import {
  BasePoint,
  Editor,
  Node,
  Range,
  Descendant as SlateDescendant,
  Element as SlateElement,
  Text,
  Transforms,
  createEditor,
} from "slate";
import { withHistory } from "slate-history";
import {
  Editable,
  ReactEditor,
  RenderElementProps,
  Slate,
  useFocused,
  useSelected,
  useSlate,
  useSlateStatic,
  withReact,
} from "slate-react";
import {
  EditableProps,
  RenderLeafProps,
  RenderPlaceholderProps,
} from "slate-react/dist/components/editable";
import { getSegments } from "sql-highlight";

type CodeTagNode = {
  type: "code-tag";
  label: string;
  jsSnippet: ObjectPath | CustomCode;
  children: Descendant[];
  openDataPicker?: boolean;
};

const isCodeTagNode = (x: any): x is CodeTagNode => {
  return x.type === "code-tag";
};

const getSqlParser = memoizeOne(() => import("pgsql-ast-parser"));

type Descendant = SlateDescendant | CodeTagNode;

export interface TemplatedTextEditorProps {
  className?: string;
  value?: TemplatedString;
  onChange: (value: TemplatedString) => void;
  data?: Record<string, any>;
  schema?: DataPickerTypesSchema;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
  onKeyDown?: EditableProps["onKeyDown"];
  onBlur?: EditableProps["onBlur"];
  scrollerContainerClassName?: string;
  sql?: boolean;
  // Only used when `sql` is true
  dataSourceSchema?: DataSourceSchema;
  showExpressionAsPreviewValue?: boolean;
  prefix?: string;
  multiLine?: boolean;
  component?: Component;
  "data-plasmic-prop"?: string;
  exprCtx: ExprCtx;
}

const editorCache = new WeakMap<
  Editor,
  (
    ...args: DropFirst<Parameters<typeof doResetNodes>>
  ) => ReturnType<typeof doResetNodes>
>();

// We debounce reseting the nodes when a new value is provided to avoid an
// infinite loop of updates when the text editor is controlled by a parent
// component and multiple changes are made in sequence (which makes an older
// and newer values to keep being passed to the props as a different new value
// and reset)
const resetNodes: typeof doResetNodes = (editor, options) => {
  const fn = xSetDefault(editorCache, editor, () =>
    debounce((opts) => doResetNodes(editor, opts), 0)
  );
  fn(options);
};

export const TemplatedTextEditor = React.forwardRef<
  PropEditorRef,
  TemplatedTextEditorProps
>(
  (
    {
      className,
      value: templatedString,
      onChange,
      placeholder,
      readOnly,
      disabled,
      data,
      schema,
      onBlur,
      onKeyDown,
      scrollerContainerClassName,
      sql,
      dataSourceSchema,
      showExpressionAsPreviewValue = true,
      component,
      prefix,
      multiLine,
      "data-plasmic-prop": dataPlasmicProp,
    },
    outerRef
  ) => {
    const editor = React.useMemo(
      () =>
        sql || multiLine
          ? withCodeTag(withReact(withHistory(createEditor())))
          : withCodeTag(withSingleLine(withReact(withHistory(createEditor())))),
      []
    );
    const [validSqlString, setValidSqlString] = React.useState(true);
    const studioCtx = useStudioCtx();

    const slateContainerRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle<PropEditorRef, PropEditorRef>(
      outerRef,
      () => ({
        focus: () => {
          ReactEditor.focus(editor);
          Transforms.select(editor, Editor.end(editor, []));
        },
        isFocused: () => ReactEditor.isFocused(editor),
        element: slateContainerRef.current,
      }),
      [slateContainerRef, editor]
    );

    const value = React.useMemo(
      () =>
        parseTemplatedStringToSlateNodes(templatedString, {
          projectFlags: studioCtx.projectFlags(),
          component: component ?? null,
          inStudio: true,
        }),
      [templatedString, component, studioCtx]
    );

    const isEmptyTextSlateDescendant = (descendants: Descendant[]) => {
      if (descendants.length !== 1) {
        return false;
      }
      return (
        getTextFromDescendents(descendants, {
          projectFlags: studioCtx.projectFlags(),
          component: component ?? null,
          inStudio: true,
        }) === "``"
      );
    };

    const onSlateChange = React.useCallback(
      async (newValue: Descendant[]) => {
        // @hack Some browsers will try to get the contenteditable
        // to stay focused. So we're clearing the scrollTop of the
        // content HTML.
        document.documentElement.scrollTop = 0;
        if (
          isEqual(newValue, value) ||
          (isEmptyTextSlateDescendant(newValue) &&
            isEmptyTextSlateDescendant(value))
        ) {
          return;
        }

        const newVal = resolveTemplatedString(newValue);

        if (sql) {
          if (!(await isValidSqlString(newVal))) {
            setValidSqlString(false);
            return;
          } else {
            setValidSqlString(true);
          }
        }

        onChange(newVal);
      },
      [value, onChange, sql]
    );

    const renderElementFn = React.useMemo(
      () => (props: RenderElementProps) =>
        renderElement(
          props,
          data,
          schema,
          showExpressionAsPreviewValue,
          prefix,
          disabled
        ),
      [data, schema, showExpressionAsPreviewValue, prefix]
    );

    const decorate = useCallback(([node, path]) => {
      const ranges: Range[] = [];
      if (!Text.isText(node)) {
        return ranges;
      }
      const segments = getSegments(node.text);
      let start = 0;

      for (const segment of segments) {
        const length = segment.content.length;
        const end = start + length;

        if (typeof segment !== "string") {
          ranges.push({
            segmentType: segment.name,
            anchor: { path, offset: start },
            focus: { path, offset: end },
          } as Range);
        }

        start = end;
      }

      return ranges;
    }, []);

    const [moved, setMoved] = useState(false);

    const previousValue = React.useRef(value);
    // Slate doesn't support changing the values externally, so we need to keep
    // track of it
    useLayoutEffect(() => {
      if (
        previousValue.current !== value &&
        getTextFromDescendents(editor.children, {
          projectFlags: studioCtx.projectFlags(),
          component: component ?? null,
          inStudio: true,
        }) !==
          getTextFromDescendents(value, {
            projectFlags: studioCtx.projectFlags(),
            component: component ?? null,
            inStudio: true,
          })
      ) {
        resetNodes(editor, { nodes: value as SlateDescendant[] });
      }
      previousValue.current = value;
    }, [value, component, studioCtx]);

    return (
      <div className="flex-col fill-width">
        <div
          ref={slateContainerRef}
          onPointerMove={() => setMoved(true)}
          onPointerLeave={() => setMoved(false)}
          data-plasmic-prop={dataPlasmicProp}
        >
          <Slate
            editor={editor}
            value={value as SlateDescendant[]}
            onChange={onSlateChange}
          >
            <CustomCaret
              slateContainerRef={slateContainerRef}
              scrollerContainerClassName={scrollerContainerClassName}
            />
            <Editable
              className={cx(
                {
                  "templated-string-input": true,
                  "templated-string-input--moved": moved,
                  "fill-width": true,
                  code: !!sql,
                },
                className
              )}
              renderElement={renderElementFn}
              renderLeaf={sql ? renderSqlLeaf : renderLeaf}
              renderPlaceholder={renderPlaceholder}
              decorate={sql ? decorate : undefined}
              placeholder={placeholder}
              readOnly={readOnly || disabled}
              disabled={disabled}
              onKeyDown={(event) => {
                setMoved(false);
                onKeyDown?.(event);
              }}
              onBlur={onBlur}
            />
          </Slate>
        </div>
        <div className="flex-row fill-width">
          {sql && !validSqlString && (
            <small className={cx(styles.errorMsg, "flex-no-shrink")}>
              Invalid SQL string
            </small>
          )}
          {sql && dataSourceSchema && (
            <CopilotCodePrompt
              className="mt-sm"
              data={data}
              onUpdate={(str) => {
                resetNodes(editor, {
                  nodes: parseTemplatedStringToSlateNodes(
                    interpolatedStringToTemplatedString(str),
                    {
                      projectFlags: studioCtx.projectFlags(),
                      component: component ?? null,
                      inStudio: true,
                    }
                  ) as SlateDescendant[],
                });
              }}
              isSql
              dataSourceSchema={dataSourceSchema}
              currentValue={templatedString?.text
                .map((v) =>
                  typeof v === "string"
                    ? v
                    : `{{ ${
                        asCode(v, {
                          projectFlags: studioCtx.projectFlags(),
                          component: component ?? null,
                          inStudio: true,
                        }).code
                      } }}`
                )
                .join("")}
            />
          )}
        </div>
      </div>
    );
  }
);

function interpolatedStringToTemplatedString(str: string): TemplatedString {
  const { jsSnippets, stringSegments } = getDynamicBindings(str);
  return new TemplatedString({
    text: stringSegments.map((seg, i) =>
      isDynamicValue(seg) ? customCode(jsSnippets[i]) : seg
    ),
  });
}

// Ensures the syntax is correct and the dynamic values can become parameters
// in a prepared statement
async function isValidSqlString(val: TemplatedString) {
  // Generate random ids for the params so we can ensure they're all used
  const params: string[] = [];
  const sqlStr = val.text
    .map((v) => {
      if (typeof v === "string") {
        return v;
      }
      const paramId = `$${randUint16()}`;
      params.push(paramId);
      return paramId;
    })
    .join("");

  const { parse, astVisitor } = await getSqlParser();

  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(sqlStr);
  } catch {
    return false;
  }

  if (ast.length !== 1) {
    return false;
  }

  // We need to ensure every param is used to avoid things like:
  // `WHERE name = 'SomeName {{$ctx.surname}}'`
  const parsedParams: string[] = [];
  const visitor = astVisitor((v) => ({
    parameter: (p) => {
      parsedParams.push(p.name);
      v.super().parameter(p);
    },
  }));

  visitor.statement(ast[0]);

  return arrayEqIgnoreOrder(parsedParams, params);
}

function getTextFromDescendents(value: Descendant[], exprCtx: ExprCtx) {
  return asCode(resolveTemplatedString(value), exprCtx).code;
}

function renderSqlLeaf({ attributes, children, leaf }: RenderLeafProps) {
  const segmentColor = (
    segmentType:
      | "keyword"
      | "function"
      | "number"
      | "string"
      | "special"
      | "bracket"
      | "clear"
      | undefined
  ): string | undefined => {
    switch (segmentType) {
      case "bracket":
        return styles.sqlBracketColor;
      case "function":
        return styles.sqlFunctionColor;
      case "keyword":
        return styles.sqlKeywordColor;
      case "number":
        return styles.sqlNumberColor;
      case "special":
        return styles.sqlSpecialColor;
      default:
        return undefined;
    }
  };
  return (
    <span
      {...attributes}
      className={cx(segmentColor(leaf["segmentType"]), styles.content)}
    >
      {children}
    </span>
  );
}

function renderLeaf({ attributes, children }: RenderLeafProps) {
  return (
    <span {...attributes} className={styles.content}>
      {children}
    </span>
  );
}

function renderPlaceholder({ attributes, children }: RenderPlaceholderProps) {
  return (
    <span {...attributes} tabIndex={-1} className={styles.placeholder}>
      {children}
    </span>
  );
}

function renderElement(
  props: RenderElementProps,
  data: Record<string, any> | undefined,
  schema: DataPickerTypesSchema | undefined,
  showExpressionAsPreviewValue: boolean | undefined,
  prefix: string | undefined,
  disabled: boolean | undefined
) {
  switch (props.element.type as string) {
    case "code-tag":
      return (
        <CodeTag
          {...(props as any)}
          data={data}
          schema={schema}
          showExpressionAsPreviewValue={showExpressionAsPreviewValue}
          disabled={disabled}
        />
      );
    default:
      return <DefaultElement {...props} prefix={prefix} />;
  }
}

function withSingleLine<T extends Editor>(editor: T): T {
  const { normalizeNode, insertText } = editor;

  editor.normalizeNode = ([node, path]) => {
    if (path.length === 0) {
      if (editor.children.length > 1) {
        Transforms.mergeNodes(editor);
      }
    }

    return normalizeNode([node, path]);
  };

  // Also remove the unicode line break from strings
  editor.insertText = (text) => {
    const cleanedText = text.replace(/\u2028/g, "");

    if (cleanedText !== text) {
      Transforms.insertText(editor, cleanedText);
    } else {
      insertText(cleanedText);
    }
  };

  return editor;
}

function withCodeTag<T extends Editor>(editor: T): T {
  const { isVoid, isInline, insertText, insertFragment, insertData } = editor;

  editor.isVoid = (element) => {
    return (element.type as string) === "code-tag" ? true : isVoid(element);
  };

  editor.isInline = (element) => {
    return (element.type as string) === "code-tag" ? true : isInline(element);
  };

  editor.insertText = (text) => {
    const { selection } = editor;

    if (text === "{" && selection && Range.isCollapsed(selection)) {
      const { anchor } = selection;
      const before = Editor.before(editor, selection, {
        distance: 1,
        unit: "character",
      });
      if (before) {
        const range = {
          anchor,
          focus: before,
        };
        const beforeText = Editor.string(editor, range);
        if (beforeText === "{") {
          Transforms.select(editor, range);
          Transforms.delete(editor);
          insertCodeTag(editor);
          return;
        }
      }
    }

    insertText(text);
  };

  editor.insertData = (data) => {
    const fragment = data.getData("application/x-slate-fragment");
    if (fragment) {
      const decoded = decodeURIComponent(window.atob(fragment));
      const parsedNodes = JSON.parse(decoded) as Node[];
      parsedNodes.forEach((node) => {
        if (SlateElement.isElement(node)) {
          node.children.map((element: Descendant) => {
            if (isCodeTagNode(element)) {
              const curValue: any = element.jsSnippet;
              const newValue = createExprForDataPickerValue(
                curValue.path ?? curValue.code,
                codeLit(curValue.fallback?.code)
              );
              element.jsSnippet = newValue;
            }
          });
        }
      });
      insertFragment(parsedNodes);
    } else {
      insertData(data);
    }
  };

  return editor;
}

function parseTemplatedStringToSlateNodes(
  value: TemplatedString | undefined,
  exprCtx: ExprCtx
): Descendant[] {
  return value
    ? [
        {
          type: "paragraph",
          children:
            value.text.length > 0
              ? value.text.flatMap((t, i): Descendant[] => {
                  if (isKnownObjectPath(t) || isKnownCustomCode(t)) {
                    const nodes: Descendant[] = [
                      {
                        type: "code-tag" as const,
                        label: asCode(t, exprCtx).code,
                        jsSnippet: t,
                        children: [{ text: "" }],
                      },
                    ];
                    if (
                      i + 1 >= value.text.length ||
                      isRealCodeExpr(value.text[i + 1])
                    ) {
                      // insert empty spaces between and after dynamic values so we can type text there
                      nodes.push({ text: "" });
                    }
                    if (i === 0) {
                      nodes.unshift({ text: "" });
                    }

                    return nodes;
                  }
                  return [
                    {
                      text: t,
                    },
                  ];
                })
              : [
                  {
                    text: "",
                  },
                ],
        } as SlateDescendant,
      ]
    : [
        {
          type: "paragraph",
          children: [
            {
              text: "",
            },
          ],
        } as SlateDescendant,
      ];
}

function resolveTemplatedString(nodes: Descendant[]): TemplatedString {
  const traverseTree = (_nodes: Descendant[]) => {
    return _nodes.flatMap((node, idx) =>
      node["type"] === "code-tag"
        ? node["jsSnippet"]
        : node["type"] === "paragraph"
        ? idx === _nodes.length - 1
          ? traverseTree(node["children"])
          : [...traverseTree(node["children"]), "\n"]
        : node["text"]
    );
  };

  return new TemplatedString({ text: traverseTree(nodes) });
}

interface CodeTagProps {
  element: CodeTagNode;
  // eslint-disable-next-line @typescript-eslint/ban-types
  attributes: Object;
  children: React.ReactElement;
  data: Record<string, any> | undefined;
  schema?: DataPickerTypesSchema;
  showExpressionAsPreviewValue?: boolean;
  disabled?: boolean;
  exprCtx: ExprCtx;
}

/**
 * Desired behavior:
 *
 * - Make them click once to select, click again to open
 * - Click to open only works if they're the only selected node
 */
function CodeTag({
  attributes,
  children,
  element,
  data,
  schema,
  showExpressionAsPreviewValue,
  disabled,
  exprCtx,
}: CodeTagProps) {
  const [explicitlyOpened, setExplicitlyOpened] = React.useState(false);
  const [open, setOpen] = React.useState(() => element.openDataPicker ?? false);
  const editor = useSlateStatic();
  const path = ReactEditor.findPath(editor, element as any);
  const selected = useSelected();

  const wasOpen = usePrevious(open);
  // Restore focus on the input when exiting the popover.
  useEffect(() => {
    if (!open && wasOpen) {
      spawn(
        (async () => {
          while (!ReactEditor.isFocused(editor)) {
            // Some open issues:
            // - There's a delay before the focusing actually works (can take a few iterations of this loop). Also tried directly .focus()ing on the DOM element, no difference. Something else is going on. So there's a brief flash of unfocused state.
            // - The fake caret is left at the start for some reason, until you mouse out.
            ReactEditor.focus(editor);

            try {
              // By default, we select the node itself. This is if you explicitly clicked on it before.
              // Still important to be able to select the node so that you can operate on it (delete, cut, copy, paste, etc.).
              Transforms.select(editor, path);
              if (!explicitlyOpened) {
                // If this was open because it's a newly inserted pill, then set caret after it instead so that you can keep on typing.
                Transforms.move(editor, { distance: 1, unit: "character" });
              }
            } catch (e) {
              // This can happen if the node was deleted (from the Delete button in the modal). That's fine, we just don't want to crash.
            }
            await delay(10);
          }
        })()
      );
    }
  }, [open]);

  // This needs to be a function rather than a boolean because if we had a broader selection and then click to select
  // just this node, none of the props or useSelected for this node changes, so this won't be re-rendered and hence this
  // boolean won't be re-evaluated.
  const isOnlySelectedNode = () =>
    JSON.stringify(editor.selection?.anchor) ===
    JSON.stringify(editor.selection?.focus);

  React.useEffect(() => {
    if (element.openDataPicker) {
      Transforms.setNodes(editor, { openDataPicker: false } as any, {
        at: path,
      });
    }
  }, [element, path, editor]);

  let previewValue: any;
  try {
    previewValue = data ? tryEvalExpr(element.label, data).val : undefined;
  } catch {
    previewValue = undefined;
  }
  const codePreviewValue = summarizeExpr(element.jsSnippet, exprCtx);

  const value = extractValueSavedFromDataPicker(element.jsSnippet, exprCtx);

  // Prevent double click from closing modal if already selected.
  const preventPopoverClosingRef = useRef(false);
  const preventAccidentalPopoverClosing = () => {
    preventPopoverClosingRef.current = true;

    // Loose attempt. Should really be canceling and resetting timeout.
    setTimeout(() => {
      preventPopoverClosingRef.current = false;
    }, 500 /* Default double click delay */);
  };

  return (
    <Popover
      content={
        <DataPicker
          value={value}
          onChange={(val) => {
            val = val || "";
            const newExpr = createExprForDataPickerValue(
              val,
              element.jsSnippet?.fallback
                ? clone(element.jsSnippet.fallback)
                : undefined
            );
            Transforms.setNodes(
              editor,
              {
                label: asCode(newExpr, exprCtx).code,
                jsSnippet: newExpr,
              } as any,
              {
                at: path,
              }
            );
            setOpen(false);
          }}
          onDelete={() => {
            setOpen(false);
            Transforms.delete(editor, { at: path });
          }}
          onCancel={() => setOpen(false)}
          data={data}
          schema={schema}
        />
      }
      open={open}
      // We want this only so that the popover dismisses on click outside,
      // and doesn't dismiss on pointer leave.
      trigger={"click"}
      onOpenChange={(newOpen) => {
        if (!newOpen && preventPopoverClosingRef.current) {
          setOpen(false);
        } else {
          preventAccidentalPopoverClosing();
        }
      }}
      destroyTooltipOnHide={true}
      overlayClassName="data-picker-popover-overlay"
    >
      <div
        {...attributes}
        tabIndex={-1}
        contentEditable={false}
        onClick={() => {
          if (disabled) {
            return;
          }
          // In most text editors, clicking an object like this selects it rather than interacts with it, but we're choosing to interact (open) because it's common.
          // We tolerate single click to open because we also show a Delete button inside the modal, which is a very common thing you want to do with pills.
          // To do other operations, like cutting/copying, you'll need to edit it or maneuver with keyboard.
          setOpen(true);
          setExplicitlyOpened(true);
        }}
        className={cx(
          "inline-block",
          "code-chip",
          selected && "right-panel-input-background-selected"
        )}
      >
        {children}
        {`${showExpressionAsPreviewValue ? codePreviewValue : previewValue}`}
      </div>
    </Popover>
  );
}

interface DefaultElementProps extends RenderElementProps {
  prefix?: string;
}

function DefaultElement({
  element,
  attributes,
  prefix,
  children,
}: DefaultElementProps) {
  const editor = useSlateStatic();
  const path = prefix ? ReactEditor.findPath(editor, element) : [];
  const Tag = editor.isInline(element) ? "span" : "div";
  const hasPrefix = !!prefix && path.length === 1 && path[0] === 0;
  return (
    <Tag {...attributes}>
      {hasPrefix && (
        <span
          className={styles.prefix}
          contentEditable={false}
          onClick={() => Transforms.select(editor, Editor.start(editor, []))}
        >
          {prefix}{" "}
        </span>
      )}
      {children}
    </Tag>
  );
}

interface CustomCaretProps {
  slateContainerRef: React.RefObject<HTMLDivElement>;
  scrollerContainerClassName?: string;
}

function CustomCaret({
  slateContainerRef,
  scrollerContainerClassName,
}: CustomCaretProps) {
  const editor = useSlate();
  const { selection } = editor;
  const [boundingClientRect, setBoundingClientRect] = React.useState<DOMRect>();
  const focused = useFocused();

  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const elt = scrollerContainerClassName
      ? document.getElementsByClassName(scrollerContainerClassName).item(0)
      : undefined;
    const listener = () => {
      setTick(tick + 1);
    };
    elt?.addEventListener("scroll", listener, false);
    return () => elt?.removeEventListener("scroll", listener, false);
  }, [tick, scrollerContainerClassName]);

  React.useEffect(() => {
    const domSelection = window.getSelection();
    if (!domSelection || !selection || !Range.isCollapsed(selection)) {
      setBoundingClientRect(undefined);
      return;
    }

    const path = selection.anchor.path;
    let element: SlateDescendant | Editor = editor;
    let voidOrNotFoundElement = false;
    for (const pathPosition of path) {
      if (!("children" in element)) {
        voidOrNotFoundElement = true;
        break;
      } else {
        element = element.children[pathPosition];
        if (Editor.isVoid(editor, element)) {
          voidOrNotFoundElement = true;
          break;
        }
      }
    }

    if (voidOrNotFoundElement || domSelection.rangeCount === 0) {
      setBoundingClientRect(undefined);
      return;
    }
    setBoundingClientRect(domSelection.getRangeAt(0).getBoundingClientRect());
  }, [editor, focused, tick, selection]);

  const cachedAnchor = React.useMemo(
    () => selection?.anchor,
    [JSON.stringify(selection?.anchor ?? null)]
  );

  const ctx = useContext(ContextMenuContext);
  // We need to know if the editor was focused at the time the mouse went down on the insert button (which causes focus
  // to be lost).
  const wasFocused = useRef(false);
  useSignalListener(
    ctx.onPointerDownSignal,
    () => {
      wasFocused.current = focused;
    },
    [focused]
  );
  useSignalListener(
    ctx.onClickSignal,
    () => {
      const focused_ = wasFocused.current;
      if (
        !focused_ ||
        !boundingClientRect ||
        !slateContainerRef.current ||
        !cachedAnchor
      ) {
        Transforms.select(editor, Editor.end(editor, []));
      } else {
        Transforms.select(editor, cachedAnchor);
      }
      insertCodeTag(editor);
    },
    [
      editor,
      focused,
      cachedAnchor,
      boundingClientRect,
      slateContainerRef.current,
    ]
  );

  if (!boundingClientRect || !slateContainerRef.current || !cachedAnchor) {
    return null;
  }

  return ReactDOM.createPortal(
    <CaretUI
      top={Math.round(boundingClientRect.top)}
      left={Math.round(boundingClientRect.left)}
      anchor={cachedAnchor}
    />,
    slateContainerRef.current
  );
}

interface CaretUIProps {
  top: number;
  left: number;
  anchor: BasePoint;
}

function CaretUI({ top, left, anchor }: CaretUIProps) {
  const editor = useSlateStatic();
  const isFocused = useFocused();
  const [hover, setHover] = useState(false);

  const ctx = useContext(ContextMenuContext);
  useEffect(() => {
    ctx.setOpenTooltip(isFocused ? false : undefined);
    return () => ctx.setOpenTooltip(undefined);
  }, [isFocused]);
  useSignalListener(ctx.onPointerEnterSignal, () => {
    setHover(true);
  });
  useSignalListener(ctx.onPointerLeaveSignal, () => {
    setHover(false);
  });

  const animationNames = ["caret-animation", "caret-animation2"];
  const previousAnimationName = React.useRef(animationNames[0]);
  const caretAnimationName = React.useMemo(() => {
    // Hack to disable animation while the caret is moving based on
    // https://github.com/codemirror/view/blob/adbfd33c10911c28071ce0502ed33c5ab6c1187f/src/draw-selection.ts#L115
    previousAnimationName.current =
      previousAnimationName.current === animationNames[0]
        ? animationNames[1]
        : animationNames[0];
    return previousAnimationName.current;
  }, [left, top]);

  return (
    <div
      className={cx("custom-caret-container")}
      style={{
        transform: `translate3d(${left}px, ${top}px, 0)`,
        animationName: caretAnimationName,
        ...(isFocused ? {} : { display: "none" }),
      }}
    >
      <Tooltip
        title={"Insert dynamic value here"}
        overlayClassName={"show-ant-tooltip-arrow"}
        open={hover}
      >
        <div className="custom-caret" />
      </Tooltip>
    </div>
  );
}

function insertCodeTag(editor: Editor) {
  const element = {
    type: "code-tag",
    children: [{ text: "" }],
    label: "",
    jsSnippet: new ObjectPath({
      path: ["undefined"],
      fallback: codeLit(undefined),
    }),
    openDataPicker: true,
  };
  const previous = Editor.previous(editor);
  const nodes: Node[] = [element as Node];
  if (!previous || previous[0]["type"] === "code-tag") {
    nodes.unshift({ text: "" });
  }
  const after = Editor.next(editor);
  if (!after || after[0]["type"] === "code-tag") {
    nodes.push({ text: "" });
  }
  Transforms.insertNodes(editor, nodes);
  Transforms.collapse(editor, { edge: "end" });
}
