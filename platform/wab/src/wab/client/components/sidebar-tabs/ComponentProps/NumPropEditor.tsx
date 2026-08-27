import { useDataTokenSuggestionsMenu } from "@/wab/client/components/sidebar-tabs/DataBinding/useDataTokenSuggestionsMenu";
import { useUndo } from "@/wab/client/shortcuts/studio/useUndo";
import { InputNumber, Slider, notification } from "antd";
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
  const {
    value: draft,
    isDirty,
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
    if (!isDirty || val === undefined) {
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
      notification.warning({
        message: "Invalid value",
        description: `Expected a number, but got "${val}"`,
      });
    } else if (!isNil(props.min) && numeric < props.min) {
      notification.warning({
        message: "Value is out of range",
        description: `Minimum value is ${props.min}, but got "${val}"`,
      });
    } else if (!isNil(props.max) && numeric > props.max) {
      notification.warning({
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

  // Picking a token switches the prop to a dynamic value, which unmounts this
  // editor — and the unmount below submits the draft. Without this the stale
  // draft would overwrite the token that was just picked.
  const pickedTokenRef = React.useRef(false);
  useUnmount(() => {
    if (pickedTokenRef.current) {
      return;
    }
    // Same behavior of `useUnmount` in `StringPropEditor`.
    defer(submitDraft);
  });

  const queryText = draft?.toString() ?? "";
  const {
    openMenu,
    getComboboxProps,
    getInputProps,
    menu: dataTokenSuggestionsMenu,
  } = useDataTokenSuggestionsMenu({
    category: "number",
    queryText,
    onSelect: () => {
      pickedTokenRef.current = true;
    },
  });

  return (
    <div {...getComboboxProps()}>
      <InputNumber
        {...getInputProps({
          onKeyDown: handleKeyDown,
          onBlur: submitDraft,
        })}
        type="number" // https://ant.design/components/input-number#notes
        className="code textboxlike fill-width"
        size="small"
        placeholder={props.defaultValueHint?.toString() ?? "unset"}
        value={draft}
        onChange={(val) => {
          setDraft(val ?? undefined);
          openMenu();
        }}
        onPressEnter={submitDraft}
        readOnly={props.readOnly}
        data-plasmic-prop={props["data-plasmic-prop"]}
      />
      {dataTokenSuggestionsMenu}
    </div>
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
