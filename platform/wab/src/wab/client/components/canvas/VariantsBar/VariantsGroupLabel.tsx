import * as React from "react";
import {
  DefaultVariantsGroupLabelProps,
  PlasmicVariantsGroupLabel,
} from "../../../plasmic/plasmic_kit_variants_bar/PlasmicVariantsGroupLabel";

interface VariantsGroupLabelProps extends DefaultVariantsGroupLabelProps {}

function VariantsGroupLabel(props: VariantsGroupLabelProps) {
  return props.children ? <PlasmicVariantsGroupLabel {...props} /> : null;
}

export default VariantsGroupLabel;
