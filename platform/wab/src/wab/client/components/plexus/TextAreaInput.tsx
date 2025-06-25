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
    NativeTextAreaProps {
  value: string;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}

function TextAreaInput(props: TextAreaInputProps) {
  const { inputRef, ...rest } = props;
  const textAreaRef = inputRef ?? React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    const el = textAreaRef.current;
    if (props.type === "minimal" && el) {
      // Reset height to allow shrinking when text is deleted
      el.style.height = "auto";
      // Then set to scrollHeight so it expands to fit new content
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [props.value]);
  return <PlasmicTextAreaInput {...rest} ariaTextArea={{ ref: textAreaRef }} />;
}

export default TextAreaInput;
