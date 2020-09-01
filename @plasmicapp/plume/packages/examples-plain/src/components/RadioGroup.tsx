import { PlumeRadioGroupProps, useRadioGroup } from "@plasmicapp/plume";
import * as React from 'react';
import { PlasmicRadioGroup } from './plasmic/plain_kit/PlasmicRadioGroup';

interface RadioGroupProps extends PlumeRadioGroupProps {}

function RadioGroup(props: RadioGroupProps) {
  const {plumeProps} = useRadioGroup(
    PlasmicRadioGroup,
    props,
    {
      isDisabledVariant: ["isDisabled", "isDisabled"],
      isHorizontalVariant: ["isHorizontal", "isHorizontal"],
      hasLabelVariant: ["hasLabel", "hasLabel"],
      root: "root",
      label: "labelContainer"
    });
  return <PlasmicRadioGroup {...plumeProps} />;
}

export default RadioGroup;
