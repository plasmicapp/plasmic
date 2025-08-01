import { useFocusOnDisplayed } from "@/wab/client/dom-utils";
import {
  PlasmicTextbox,
  PlasmicTextbox__VariantsArgs,
} from "@/wab/client/plasmic/plasmic_kit/PlasmicTextbox";
import { useForwardedRef } from "@/wab/commons/components/ReactUtil";
import React from "react";
import { useUnmount } from "react-use";

type SimpleTextboxProps = React.ComponentProps<"input"> & {
  onValueChange: (value: string) => void;
  defaultValue: string;
  selectAllOnFocus?: boolean;
  fontSize?: PlasmicTextbox__VariantsArgs["fontSize"];
  fontStyle?: PlasmicTextbox__VariantsArgs["fontStyle"];
};

export const SimpleTextbox = React.forwardRef(function SimpleTextbox(
  props: SimpleTextboxProps,
  outerRef: React.Ref<HTMLInputElement>
) {
  const {
    onValueChange,
    defaultValue,
    selectAllOnFocus,
    className,
    onChange,
    onFocus,
    onBlur,
    onKeyPress,
    fontSize,
    fontStyle,
    ...restInputProps
  } = props;

  const [isEditing, setEditing] = React.useState(false);
  const [curValue, setCurValue] = React.useState<string>("");
  const { ref, onRef } = useForwardedRef(outerRef);

  const autoFocus = props.autoFocus;

  useFocusOnDisplayed(ref, { autoFocus });

  useUnmount(() => {
    // Upon unmounting, onBlur will not have a chance to fire, so
    // if we gotta call onValueChange() now if any edits have been made
    if (isEditing) {
      onValueChange(curValue);
      setEditing(false);
    }
  });

  return (
    <PlasmicTextbox
      variants={{
        fontSize: fontSize,
        fontStyle: fontStyle,
      }}
      root={{ className }}
      textbox={{
        type: "text",
        ref: onRef,
        readOnly: props.readOnly,
        onChange: (e) => {
          setEditing(true);
          setCurValue(e.target.value);
          onChange && onChange(e);
        },
        onFocus: (e) => {
          if (selectAllOnFocus) {
            // this.ref is not updated when the input is autoFocused
            e.target.select();
          }
          onFocus && onFocus(e);
        },
        onBlur: (e) => {
          if (isEditing) {
            onValueChange(curValue);
            setEditing(false);
          }
          onBlur && onBlur(e);
        },
        onKeyPress: (e) => {
          if (e.key === "Escape") {
            setEditing(false);
          } else if (e.key === "Enter") {
            onValueChange(curValue);
            setEditing(false);
          }
          onKeyPress && onKeyPress(e);
        },
        value: isEditing ? curValue : props.defaultValue,
        ...restInputProps,
      }}
    />
  );
});
