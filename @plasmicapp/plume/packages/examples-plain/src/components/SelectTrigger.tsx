import { PlumeButtonProps, PlumeButtonRef, useButton } from "@plasmicapp/plume";
import * as React from "react";
import { PlasmicSelectTrigger } from "./plasmic/plain_kit/PlasmicSelectTrigger";

interface SelectTriggerProps extends PlumeButtonProps {}

const SelectTrigger = React.forwardRef(function SelectTrigger(props: SelectTriggerProps, ref: PlumeButtonRef) {
  const {plumeProps} = useButton(
    PlasmicSelectTrigger,
    props,
    {
      isDisabledVariant: ["isDisabled", "isDisabled"],
      root: "root"
    },
    ref
  );
  return <PlasmicSelectTrigger {...plumeProps} />;
});

export default SelectTrigger;
