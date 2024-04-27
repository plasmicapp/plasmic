import {
  DefaultVariantsGroupLabelProps,
  PlasmicVariantsGroupLabel,
} from "@/wab/client/plasmic/plasmic_kit_variants_bar/PlasmicVariantsGroupLabel";
import * as React from "react";

type VariantsGroupLabelProps = DefaultVariantsGroupLabelProps;

function VariantsGroupLabel(props: VariantsGroupLabelProps) {
  return props.children ? <PlasmicVariantsGroupLabel {...props} /> : null;
}

export default VariantsGroupLabel;
