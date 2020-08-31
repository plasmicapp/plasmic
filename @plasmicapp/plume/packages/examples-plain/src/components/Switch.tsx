import * as React from 'react';
import {
  PlasmicSwitch,
} from './plasmic/plain_kit/PlasmicSwitch';
import { PlumeSwitchProps, useSwitch, PlumeSwitchRef } from '@plasmicapp/plume';
interface SwitchProps extends PlumeSwitchProps {}

const Switch = React.forwardRef(function Switch(props: SwitchProps, ref: PlumeSwitchRef) {
  const {plumeProps} = useSwitch(
    PlasmicSwitch,
    props,
    {
      isSelectedVariant: ["isSelected", "isSelected"],
      isDisabledVariant: ["isDisabled", "isDisabled"],
      hasLabelVariant: ["hasLabel", "hasLabel"],
      root: "root"
    },
    ref
  );
  return <PlasmicSwitch {...plumeProps} />;
});

export default Switch;
