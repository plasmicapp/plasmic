import {
  DefaultTextAreaInputProps,
  PlasmicTextAreaInput,
} from "@/wab/client/plasmic/plasmic_kit_design_system_deprecated/PlasmicTextAreaInput";
import * as React from "react";

type NativeTextAreaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "defaultValue" | "onChange"
>;
export interface TextAreaInputProps
  extends DefaultTextAreaInputProps,
    NativeTextAreaProps {}

function TextAreaInput(props: TextAreaInputProps) {
  return <PlasmicTextAreaInput {...props} />;
}

export default TextAreaInput;
