import * as React from "react";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
  DefaultHostProtocolSelect__OptionGroupProps,
  PlasmicHostProtocolSelect__OptionGroup,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicHostProtocolSelect__OptionGroup";

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
