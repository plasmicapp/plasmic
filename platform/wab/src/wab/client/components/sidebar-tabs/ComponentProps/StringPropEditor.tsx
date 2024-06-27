import { checkStrSizeLimit } from "@/wab/client/components/sidebar-tabs/ComponentProps/CodeEditor";
import { TemplatedTextEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/TemplatedTextEditor";
import { DataPickerTypesSchema } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import { PropEditorRef } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { ValueSetState } from "@/wab/client/components/sidebar/sidebar-helpers";
import { useUndo } from "@/wab/client/shortcuts/studio/useUndo";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { asCode } from "@/wab/shared/core/exprs";
import {
  Component,
  isKnownTemplatedString,
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

export interface TemplatedStringPropEditorProps {
  onChange: (value: string | TemplatedString) => void;
  value: TemplatedString | string | undefined | null;
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
}

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
  const exprCtx = {
    projectFlags: studioCtx.projectFlags(),
    component: props.component ?? null,
    inStudio: true,
  };
  const {
    value: draft,
    push: setDraft,
    handleKeyDown,
    reset,
  } = useUndo<TemplatedString | string | undefined>(props.value || undefined);
  // Whenever the passed in props.value changes, we reset the state
  React.useEffect(() => {
    reset();
  }, [props.value]);
  const curValue = draft === undefined ? props.value : draft;
  const submitVal = (val: string | TemplatedString) => {
    if (
      val !== props.value &&
      checkStrSizeLimit(
        isKnownTemplatedString(val) ? asCode(val, exprCtx).code : val
      )
    ) {
      props.onChange(val);
      reset(val);
    } else {
      reset();
    }
  };
  useUnmount(() => {
    if (draft !== undefined) {
      defer(() => submitVal(draft));
    }
  });

  return !isKnownTemplatedString(props.value) &&
    (!props.data || props.disabled) ? (
    <StringPropEditor {...props} value={props.value} ref={outerRef} />
  ) : (
    <TemplatedTextEditor
      value={
        isKnownTemplatedString(curValue)
          ? curValue
          : curValue != null
          ? new TemplatedString({ text: [`${curValue}`] })
          : undefined
      }
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
      onKeyDown={(e) => {
        if (handleKeyDown(e)) {
          return;
        }

        if (e.key === "Enter" && ref.current?.isFocused()) {
          submitVal(draft ?? "");
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      // This may not fire! Doesn't seem to if trigered with .blur() in Cypress.
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
