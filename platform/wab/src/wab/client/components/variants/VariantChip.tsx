import {
  DefaultVariantChipProps,
  PlasmicVariantChip,
} from "@/wab/client/plasmic/plasmic_kit_variants/PlasmicVariantChip";
import * as React from "react";

interface VariantChipProps extends DefaultVariantChipProps {
  onClose?: (e: React.MouseEvent) => void;
}

function VariantChip(props: VariantChipProps) {
  const { onClose, ...rest } = props;
  return (
    <PlasmicVariantChip
      {...rest}
      isClosable={props.isClosable ?? !!props.onClose}
      hasIcon={props.hasIcon ?? !!props.icon}
      closeButton={
        onClose
          ? {
              tabIndex: -1,
              onClick: (e) => onClose(e),
            }
          : {}
      }
    />
  );
}

export default VariantChip;
