import * as React from "react";
import {
  PlasmicButton,
} from "./plasmic/plain_kit/PlasmicButton";
import { PlumeButtonProps, PlumeButtonRef, useButton } from "@plasmicapp/plume";

interface ButtonProps extends PlumeButtonProps {
}

const Button = React.forwardRef(function Button(props: ButtonProps, ref: PlumeButtonRef) {
  const {plumeProps} = useButton(
    PlasmicButton,
    props,
    {
      isDisabledVariant: ["isDisabled", "isDisabled"],
      showStartIconVariant: ["withIcons", "start"],
      showEndIconVariant: ["withIcons", "end"],
      root: "root"
    },
    ref
  );
  return <PlasmicButton {...plumeProps} />;
});

export default Button;
