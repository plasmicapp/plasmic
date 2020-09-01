import * as React from 'react';
import {
  PlasmicCheckbox,
} from './plasmic/plain_kit/PlasmicCheckbox';
import {useCheckbox, PlumeCheckboxProps, PlumeCheckboxRef} from "@plasmicapp/plume";

interface CheckboxProps extends PlumeCheckboxProps {

}

const Checkbox = React.forwardRef(function Checkbox(props: CheckboxProps, ref: PlumeCheckboxRef) {
  const {plumeProps} = useCheckbox(
    PlasmicCheckbox,
    props,
    {
      isSelectedVariant: ["isSelected", "isSelected"],
      isIndeterminateVariant: ["isIndeterminate", "isIndeterminate"],
      isDisabledVariant: ["isDisabled", "isDisabled"],
      hasLabelVariant: ["hasLabel", "hasLabel"],
      root: "root"
    },
    ref
  );
  return <PlasmicCheckbox {...plumeProps}/>;
});

export default Checkbox;
