import {
  DefaultCheckboxProps,
  PlasmicCheckbox,
} from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicCheckbox";
import { CheckboxRef } from "@plasmicapp/react-web";
import * as React from "react";

type CheckboxProps = DefaultCheckboxProps;

function Checkbox_(props: CheckboxProps, ref: CheckboxRef) {
  const { plasmicProps, state } = PlasmicCheckbox.useBehavior<CheckboxProps>(
    props,
    ref
  );
  return <PlasmicCheckbox {...plasmicProps} />;
}

const Checkbox = React.forwardRef(Checkbox_) as (
  props: CheckboxProps & { ref?: CheckboxRef }
) => React.ReactElement | null;

export default Object.assign(Checkbox, {
  __plumeType: "checkbox",
});
