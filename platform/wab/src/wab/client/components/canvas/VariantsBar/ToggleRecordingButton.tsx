import { Tooltip } from "antd";
import * as React from "react";
import { VARIANTS_LOWER } from "../../../../shared/Labels";
import {
  DefaultToggleRecordingButtonProps,
  PlasmicToggleRecordingButton,
} from "../../../plasmic/plasmic_kit_variants_bar/PlasmicToggleRecordingButton";

interface ToggleRecordingButtonProps extends DefaultToggleRecordingButtonProps {
  onClick: (e: React.MouseEvent) => void;
}

function ToggleRecordingButton(props: ToggleRecordingButtonProps) {
  return (
    <Tooltip
      trigger={["hover"]}
      title={
        props.isRecording
          ? `Stop recording all ${VARIANTS_LOWER}`
          : `Start recording all ${VARIANTS_LOWER}`
      }
    >
      <PlasmicToggleRecordingButton {...props} />
    </Tooltip>
  );
}

export default ToggleRecordingButton;
