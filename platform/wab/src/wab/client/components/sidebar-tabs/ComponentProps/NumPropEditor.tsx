import { useUndo } from "@/wab/client/shortcuts/studio/useUndo";
import { InputNumber, notification, Slider } from "antd";
import { defer, isNil } from "lodash";
import React, { useEffect } from "react";
import { useUnmount } from "react-use";
import type { SetOptional } from "type-fest";

interface InputNumPropEditorProps {
  onChange: (value?: number) => void;
  value: number | undefined;
  min?: number;
  max?: number;
  defaultValueHint?: number;
  readOnly?: boolean;
  "data-plasmic-prop"?: string;
}

export function InputNumPropEditor(props: InputNumPropEditorProps) {
  const ref = React.useRef<HTMLInputElement | null>(null);

  const {
    value: draft,
    push: setDraft,
    handleKeyDown,
    reset,
  } = useUndo<string | number | undefined>(props.value);
  // Whenever the passed in props.value changes, we reset the state
  useEffect(() => {
    reset();
  }, [props.value]);

  const submitDraft = () => {
    const val = draft;
    if (val === undefined) {
      return;
    }

    // Empty string is valid. Handle them early so we only need to handle
    // numeric values later.
    if (!val) {
      if (val !== props.value) {
        const newValue = typeof val === "string" ? undefined : val;
        props.onChange(newValue);
        reset(newValue);
      }
      return;
    }

    const numeric = typeof val === "string" ? +val : val;
    if (isNaN(numeric)) {
      notification.warn({
        message: "Invalid value",
        description: `Expected a number, but got "${val}"`,
      });
    } else if (!isNil(props.min) && numeric < props.min) {
      notification.warn({
        message: "Value is out of range",
        description: `Minimum value is ${props.min}, but got "${val}"`,
      });
    } else if (!isNil(props.max) && numeric > props.max) {
      notification.warn({
        message: "Value is out of range",
        description: `Maximum value is ${props.max}, but got "${val}"`,
      });
    } else if (numeric !== props.value) {
      props.onChange(numeric);
      reset(numeric);
      return;
    }

    reset();
  };

  useUnmount(() => {
    // Same behavior of `useUnmount` in `StringPropEditor`.
    defer(submitDraft);
  });

  return (
    <InputNumber
      type="number" // https://ant.design/components/input-number#notes
      className="code textboxlike fill-width"
      size="small"
      placeholder={props.defaultValueHint?.toString() ?? "unset"}
      value={draft}
      onChange={(val) => setDraft(val ?? undefined)}
      onKeyDown={handleKeyDown}
      onPressEnter={submitDraft}
      onBlur={submitDraft}
      ref={ref}
      readOnly={props.readOnly}
      data-plasmic-prop={props["data-plasmic-prop"]}
    />
  );
}

interface SliderPropEditorProps {
  onChange: (value?: number) => void;
  onAfterChange: (value?: number) => void;
  value: number | undefined;
  min: number;
  max: number;
  step?: number;
  defaultValueHint?: number;
  readOnly?: boolean;
}

export function SliderPropEditor(props: SliderPropEditorProps) {
  const { max, min, value, onChange, onAfterChange, readOnly } = props;
  const delta = max - min;

  let step: number;
  if (props.step) {
    step = props.step;
  } else {
    // Keep `step` in a way that:
    // - Total number of steps is between 50 and 100
    // - The values look "nice": either 10^n or 5*10^n
    step = Math.pow(10, Math.floor(Math.log10(delta / 50)));
    if (delta / step > 100) {
      step *= 5;
    }
  }

  return (
    <Slider
      className="ml-lg"
      handleStyle={{ borderColor: "#bcc0c4", boxShadow: "none" }}
      included={false}
      value={value ?? props.defaultValueHint}
      min={min}
      max={max}
      step={step}
      onChange={onChange}
      onAfterChange={onAfterChange}
      disabled={readOnly}
    />
  );
}

type NumPropEditorProps =
  | (InputNumPropEditorProps & { control?: "default" })
  | (SetOptional<SliderPropEditorProps, "min" | "max"> & { control: "slider" });

export function NumPropEditor(props: NumPropEditorProps) {
  if (props.control === "slider" && !isNil(props.max) && !isNil(props.min)) {
    return <SliderPropEditor {...props} min={props.min} max={props.max} />;
  } else {
    return <InputNumPropEditor {...props} />;
  }
}
