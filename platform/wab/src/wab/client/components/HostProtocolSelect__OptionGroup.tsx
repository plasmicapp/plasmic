import {
  DefaultHostProtocolSelect__OptionGroupProps,
  PlasmicHostProtocolSelect__OptionGroup,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicHostProtocolSelect__OptionGroup";
import * as React from "react";

type HostProtocolSelect__OptionGroupProps =
  DefaultHostProtocolSelect__OptionGroupProps;

function HostProtocolSelect__OptionGroup(
  props: HostProtocolSelect__OptionGroupProps
) {
  const { plasmicProps } =
    PlasmicHostProtocolSelect__OptionGroup.useBehavior(props);
  return <PlasmicHostProtocolSelect__OptionGroup {...plasmicProps} />;
}

export default Object.assign(HostProtocolSelect__OptionGroup, {
  __plumeType: "select-option-group",
});
