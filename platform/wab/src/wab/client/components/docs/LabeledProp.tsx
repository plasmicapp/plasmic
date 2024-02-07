import {
  DefaultLabeledPropProps,
  PlasmicLabeledProp,
} from "@/wab/client/plasmic/plasmic_kit_docs_portal/PlasmicLabeledProp";
import { Tooltip } from "antd";
import * as React from "react";

interface LabeledPropProps extends DefaultLabeledPropProps {
  menu?: () => React.ReactElement;
}

function LabeledProp(props: LabeledPropProps) {
  const { label, menu, ...rest } = props;
  return (
    <PlasmicLabeledProp
      {...rest}
      label={label}
      menuButton={{ menu }}
      labelContainer={{
        wrap: (x) => <Tooltip title={label}>{x as React.ReactElement}</Tooltip>,
      }}
    />
  );
}

export default LabeledProp;
