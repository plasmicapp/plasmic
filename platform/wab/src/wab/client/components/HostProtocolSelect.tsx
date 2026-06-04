import Option from "@/wab/client/components/HostProtocolSelect__Option";
import OptionGroup from "@/wab/client/components/HostProtocolSelect__OptionGroup";
import {
  DefaultHostProtocolSelectProps,
  PlasmicHostProtocolSelect,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicHostProtocolSelect";
import { SelectRef } from "@plasmicapp/react-web";
import * as React from "react";

type HostProtocolSelectProps = DefaultHostProtocolSelectProps;

function HostProtocolSelect_(props: HostProtocolSelectProps, ref: SelectRef) {
  const { ...otherProps } = props;
  const { plasmicProps, state } = PlasmicHostProtocolSelect.useBehavior(
    otherProps,
    ref
  );
  return <PlasmicHostProtocolSelect {...plasmicProps} />;
}

const HostProtocolSelect = React.forwardRef(HostProtocolSelect_);

export default Object.assign(HostProtocolSelect, {
  Option,
  OptionGroup,
  __plumeType: "select",
});
