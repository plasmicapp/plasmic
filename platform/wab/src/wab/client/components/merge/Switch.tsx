import { SwitchRef } from "@plasmicapp/react-web";
import * as React from "react";
import {
  DefaultSwitchProps,
  PlasmicSwitch,
} from "../../plasmic/plasmic_kit_merge_flow/PlasmicSwitch";

interface SwitchProps extends DefaultSwitchProps {}

function Switch_(props: SwitchProps, ref: SwitchRef) {
  const { plasmicProps, state } = PlasmicSwitch.useBehavior<SwitchProps>(
    props,
    ref
  );
  return <PlasmicSwitch {...plasmicProps} />;
}

const Switch = React.forwardRef(Switch_);

export default Object.assign(Switch, {
  __plumeType: "switch",
});
