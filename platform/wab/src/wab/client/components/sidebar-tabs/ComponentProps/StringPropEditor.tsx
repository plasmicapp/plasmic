import { checkStrSizeLimit } from "@/wab/client/components/sidebar-tabs/ComponentProps/CodeEditor";
import { TemplatedTextEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/TemplatedTextEditor";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { PropEditorRef } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { ValueSetState } from "@/wab/client/components/sidebar/sidebar-helpers";
import { useUndo } from "@/wab/client/shortcuts/studio/useUndo";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  asCode,
  ExprCtx,
  flattenTemplatedStringToString,
  hasDynamicParts,
} from "@/wab/shared/core/exprs";
import {
  Component,
  CustomCode,
  isKnownCustomCode,
  isKnownObjectPath,
  isKnownTemplatedString,
  ObjectPath,
  TemplatedString,
} from "@/wab/shared/model/classes";
import { Input, InputRef } from "antd";
import { default as classNames } from "classnames";
import { defer } from "lodash";
import React from "react";
import { useUnmount } from "react-use";

export interface StringPropEditorProps {
  onChange: (value: string) => void;
  value: string | undefined | null;
  disabled?: boolean;
  leftAligned?: boolean;
  valueSetState?: ValueSetState;
  defaultValueHint?: string;
  "data-plasmic-prop"?: string;
  readOnly?: boolean;
}

export const StringPropEditor = React.forwardRef<
  PropEditorRef,
  StringPropEditorProps
>((props, outerRef) => {
  const ref = React.useRef<InputRef | null>(null);
  React.useImperativeHandle(
    outerRef,
    () => ({
      element: ref.current?.input || null,
      focus: () => ref.current?.focus(),
      isFocused: () =>
        !!ref.current && ref.current.input === document.activeElement,
    }),
    [ref]
  );

  const {
    value: draft,
    push: setDraft,
    handleKeyDown,
    reset,
  } = useUndo(props.value || undefined);
  // Whenever the passed in props.value changes, we unset the state
  React.useEffect(() => {
    reset();
  }, [props.value]);

  const curValue = draft === undefined ? props.value : draft;

  const submitDraft = () => {
    if (
      draft !== undefined &&
      draft !== props.value &&
      checkStrSizeLimit(draft)
    ) {
      props.onChange(draft);
      reset(draft);
    } else {
      reset();
    }
  };

  useUnmount(() => {
    // On unmount, if the value in the local state differs from exprLit, then we'll
    // want to submit the change (this can happen if you type in the value textbox,
    // and then click on another tplnode, which would unmount the textbox without
    // invoking any of the onBlur / onEnterPressed).  But we do the submitting in
    // the next event pump, because we're already in the middle of re-evaluating
    // (hence the unmounting), so it's already too late for this event pump.
    defer(submitDraft);
  });

  return (
    <Input
      disabled={props.disabled}
      className={`form-control code`}
      value={`${curValue || ""}`}
      onChange={(e) => {
        setDraft(e.currentTarget.value);
      }}
      placeholder={props.defaultValueHint ?? "unset"}
      onKeyDown={handleKeyDown}
      onPressEnter={submitDraft}
      onBlur={submitDraft}
      ref={ref}
      data-plasmic-prop={props["data-plasmic-prop"]}
      readOnly={props.readOnly}
    />
  );
});

export type TemplatedStringPropEditorValue =
  | string
  | TemplatedString
  | ObjectPath
  | CustomCode;

export interface TemplatedStringPropEditorProps {
  onChange: (value: TemplatedStringPropEditorValue) => void;
  value: TemplatedStringPropEditorValue | null | undefined;
  disabled?: boolean;
  leftAligned?: boolean;
  valueSetState?: ValueSetState;
  defaultValueHint?: string;
  "data-plasmic-prop"?: string;
  readOnly?: boolean;
  data?: Record<string, any>;
  schema?: DataPickerTypesSchema;
  viewCtx?: ViewCtx;
  showExpressionAsPreviewValue?: boolean;
  component?: Component;
  control?: "default" | "large" | "multiLine";
}

/**
 * Adapter between {@link PropValueEditor} and {@link TemplatedTextEditor}.
 *
 * {@link PropValueEditor} types: JsonValue | Expr
 * {@link TemplatedTextEditor} type: TemplatedString
 */
export const TemplatedStringPropEditor = React.forwardRef<
  PropEditorRef,
  TemplatedStringPropEditorProps
>((props, outerRef) => {
  const ref = React.useRef<PropEditorRef | null>(null);
  React.useImperativeHandle(
    outerRef,
    () =>
      ref.current || {
        element: null,
        focus: () => {},
        isFocused: () => false,
      },
    [ref.current]
  );

  const studioCtx = useStudioCtx();
  const exprCtx: ExprCtx = {
    projectFlags: studioCtx.projectFlags(),
    component: props.component ?? null,
    inStudio: true,
  };
  const normalizedValue = React.useMemo(
    () => normalizeToTemplatedString(props.value),
    [props.value]
  );
  const {
    value: draft,
    push: setDraft,
    handleKeyDown,
    reset,
  } = useUndo<TemplatedString | undefined>(normalizedValue);
  // Whenever the passed in props.value changes, we reset the state
  React.useEffect(() => {
    reset();
  }, [normalizedValue]);
  const submitVal = (val: TemplatedString) => {
    if (templatedStringsEqual(val, normalizedValue, exprCtx)) {
      // Equal to original value, do nothing.
      return;
    } else if (!checkStrSizeLimit(asCode(val, exprCtx).code)) {
      // String too large, reset to initial value.
      reset();
    } else {
      // Good, notify new value to parent and reset to new initial value.
      props.onChange(simplifyTemplatedString(val));
      reset(val);
    }
  };
  useUnmount(() => {
    if (draft !== undefined) {
      defer(() => submitVal(draft));
    }
  });

  const multiLineAllowed = !!props.component || props.control === "multiLine";
  // For textarea control, use "always" mode to show as multiline by default
  const multiLineMode =
    props.control === "multiLine"
      ? "always"
      : multiLineAllowed
      ? "allowed"
      : undefined;

  return (
    <TemplatedTextEditor
      value={draft ?? normalizedValue}
      disabled={props.disabled}
      onChange={(value) => {
        setDraft(value);
        if (!ref.current?.isFocused() && value !== undefined) {
          submitVal(value);
        }
      }}
      data={props.data}
      schema={props.schema}
      component={props.component}
      placeholder={props.defaultValueHint ?? "unset"}
      multiLine={multiLineMode}
      onKeyDown={(e) => {
        // On Shift+Enter let Slate insert a newline if allowed
        if (multiLineAllowed && e.key === "Enter" && e.shiftKey) {
          return;
        }
        if (handleKeyDown(e)) {
          return;
        }

        if (e.key === "Enter" && ref.current?.isFocused() && !e.shiftKey) {
          if (props.control === "multiLine") {
            // Let the editor handle the Enter key
            return;
          }
          if (draft !== undefined) {
            submitVal(draft);
          }
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      // This may not fire! Doesn't seem to if triggered with .blur() in Cypress.
      // Maybe related? https://github.com/ianstormtaylor/slate/issues/3742
      onBlur={() => {
        if (draft !== undefined) {
          submitVal(draft);
        }
      }}
      className={classNames({
        "text-set": props.valueSetState === "isSet",
        "text-unset": props.valueSetState === "isInherited",
      })}
      data-plasmic-prop={props["data-plasmic-prop"]}
      readOnly={props.readOnly}
      showExpressionAsPreviewValue={props.showExpressionAsPreviewValue}
      scrollerContainerClassName="canvas-editor__right-pane__bottom__scroll"
      ref={ref}
      exprCtx={exprCtx}
    />
  );
});

export function isTemplatedStringEditorValue(
  x: any
): x is TemplatedStringPropEditorValue {
  return (
    typeof x === "string" ||
    isKnownTemplatedString(x) ||
    isKnownObjectPath(x) ||
    isKnownCustomCode(x)
  );
}

function normalizeToTemplatedString(
  value: TemplatedStringPropEditorValue | null | undefined
): TemplatedString {
  if (value == null) {
    return new TemplatedString({ text: [""] });
  } else if (isKnownTemplatedString(value)) {
    return value;
  } else {
    return new TemplatedString({ text: ["", value, ""] });
  }
}

function simplifyTemplatedString(
  ts: TemplatedString
): TemplatedStringPropEditorValue {
  const nonEmpty = ts.text.filter((p) => p !== "");
  if (
    nonEmpty.length === 1 &&
    (isKnownObjectPath(nonEmpty[0]) || isKnownCustomCode(nonEmpty[0]))
  ) {
    return nonEmpty[0];
  }
  if (!hasDynamicParts(ts)) {
    return flattenTemplatedStringToString(ts);
  }
  return ts;
}

/**
 * Tests equality for TemplatedStrings by comparing JavaScript codegen output.
 */
function templatedStringsEqual(
  a: TemplatedString,
  b: TemplatedString,
  exprCtx: ExprCtx
): boolean {
  const codeA = asCode(a, exprCtx).code;
  const codeB = asCode(b, exprCtx).code;
  return codeA === codeB;
}

export const _testonly = { simplifyTemplatedString, templatedStringsEqual };
