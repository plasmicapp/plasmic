// This file is owned by you, feel free to edit as you see fit.
import {
  DefaultVariantPinButtonProps,
  PlasmicVariantPinButton,
} from "@/wab/client/plasmic/plasmic_kit_variants/PlasmicVariantPinButton";
import { VARIANT_OPTION_LOWER } from "@/wab/shared/Labels";
import * as React from "react";

interface VariantPinButtonProps extends DefaultVariantPinButtonProps {
  onToggle?: () => void;
  tabIndex?: number;
}

function VariantPinButton(props: VariantPinButtonProps) {
  const { onToggle, ...rest } = props;
  const pinState = props.pinState;
  const isVisible =
    !!pinState &&
    ["selected", "pinnedTrue", "evaluatedTrue"].includes(pinState);
  const isSelected = pinState?.includes("selected");
  return (
    <PlasmicVariantPinButton
      root={
        {
          tooltip: isSelected
            ? undefined
            : isVisible
            ? `Turn off ${VARIANT_OPTION_LOWER}`
            : `View ${VARIANT_OPTION_LOWER}`,
          "data-test-class": `variant-pin-button-${
            isVisible ? "deactivate" : "activate"
          }`,
          disabled: isSelected || !onToggle,
        } as any
      }
      onClick={
        onToggle
          ? (e) => {
              e.stopPropagation();
              onToggle();
            }
          : undefined
      }
      {...rest}
    />
  );
}

export default VariantPinButton;
