import { SwitchRef } from "@plasmicapp/react-web";
import * as React from "react";
import {
  DefaultSwitchProps,
  PlasmicSwitch,
} from "@/wab/client/plasmic/plasmic_kit_page_settings/PlasmicSwitch";

type SwitchProps = DefaultSwitchProps;

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
