import { PlumeRadioProps, useRadio } from '@plasmicapp/plume';
import * as React from 'react';
import { PlasmicRadio } from './plasmic/plain_kit/PlasmicRadio';

interface RadioProps extends PlumeRadioProps {}

function Radio(props: RadioProps) {
  const {plumeProps} = useRadio(
    PlasmicRadio,
    props,
    {
      isSelectedVariant: ["isSelected", "isSelected"],
      isDisabledVariant: ["isDisabled", "isDisabled"],
      hasLabelVariant: ["hasLabel", "hasLabel"],
      root: "root"
    }
  )
  return <PlasmicRadio {...plumeProps} />;
}

export default Radio;
