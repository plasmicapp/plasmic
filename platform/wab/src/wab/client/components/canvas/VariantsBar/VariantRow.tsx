import {
  DefaultVariantRowProps,
  PlasmicVariantRow,
} from "@/wab/client/plasmic/plasmic_kit_variants_bar/PlasmicVariantRow";
import { observer } from "mobx-react";
import * as React from "react";

interface VariantRowProps extends DefaultVariantRowProps {
  onClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
}

export const VariantRow = observer(React.forwardRef(VariantRow_));

function VariantRow_(
  {
    onMouseEnter,
    onMouseLeave,
    onClick,
    onMouseDown,
    ...props
  }: VariantRowProps,
  ref: React.Ref<HTMLDivElement>
) {
  return (
    <PlasmicVariantRow
      {...props}
      root={{
        ref,
        onClick,
        onMouseDown,
        onMouseEnter,
        onMouseLeave,
      }}
    />
  );
}

export default VariantRow;
