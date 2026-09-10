import {
  DefaultCopilotPromptImageProps,
  PlasmicCopilotPromptImage,
  PlasmicCopilotPromptImage__OverridesType,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicCopilotPromptImage";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

export type CopilotPromptImageProps = DefaultCopilotPromptImageProps &
  Pick<PlasmicCopilotPromptImage__OverridesType, "img"> & {
    onDelete: () => void;
  };

function CopilotPromptImage_(
  props: CopilotPromptImageProps,
  ref: HTMLElementRefOf<"div">
) {
  const { img, onDelete, ...plasmicProps } = props;
  return (
    <PlasmicCopilotPromptImage
      root={{ ref }}
      button={{ onClick: onDelete }}
      overrides={{ img }}
      {...plasmicProps}
    />
  );
}

export const CopilotPromptImage = React.forwardRef(CopilotPromptImage_);
