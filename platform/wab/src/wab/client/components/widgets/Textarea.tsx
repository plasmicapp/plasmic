import {
  DefaultTextareaProps,
  PlasmicTextarea,
  PlasmicTextarea__OverridesType,
} from "@/wab/client/plasmic/plasmic_kit_design_system_deprecated/PlasmicTextarea";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

export interface TextareaProps extends DefaultTextareaProps {
  textareaOverrides: PlasmicTextarea__OverridesType["textarea"];
}

function Textarea_(props: TextareaProps, ref: HTMLElementRefOf<"div">) {
  const { textareaOverrides, ...restProps } = props;

  return (
    <PlasmicTextarea
      root={{ ref }}
      {...restProps}
      overrides={{
        textarea: textareaOverrides,
      }}
    />
  );
}

const Textarea = React.forwardRef(Textarea_);
export default Textarea;
