import * as React from "react";
import {
  PlasmicTextField,
} from "./plasmic/plain_kit/PlasmicTextField";
import { PlumeTextFieldProps, useTextField, PlumeTextFieldRef } from "@plasmicapp/plume";

interface TextfieldProps extends PlumeTextFieldProps {}

const TextField = React.forwardRef(function TextField(props: TextfieldProps, ref: PlumeTextFieldRef) {
  const {plumeProps} = useTextField(
    PlasmicTextField,
    props,
    {
      isDisabledVariant: ["isDisabled", "isDisabled"],
      hasLabelVariant: ["hasLabel", "hasLabel"],
      showStartIconVariant: ["withIcons", "start"],
      showEndIconVariant: ["withIcons", "end"],

      root: "root",
      textbox: "textbox",
      label: "labelContainer",
    },
    ref
  );
  return <PlasmicTextField {...plumeProps} />;
});

export default TextField;
