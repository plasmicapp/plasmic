import Option from "@/HostProtocolSelect__Option";
import OptionGroup from "@/HostProtocolSelect__OptionGroup";
import { SelectRef } from "@plasmicapp/react-web";
import * as React from "react";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
  DefaultHostProtocolSelectProps,
  PlasmicHostProtocolSelect,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicHostProtocolSelect";

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
