import {
  DefaultCopilotPromptImageProps,
  PlasmicCopilotPromptImage,
  PlasmicCopilotPromptImage__OverridesType,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicCopilotPromptImage";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

export type CopilotPromptImageProps = DefaultCopilotPromptImageProps &
  Pick<PlasmicCopilotPromptImage__OverridesType, "img" | "closeIconContainer">;

function CopilotPromptImage_(
  props: CopilotPromptImageProps,
  ref: HTMLElementRefOf<"div">
) {
  const { img, closeIconContainer, ...plasmicProps } = props;
  return (
    <PlasmicCopilotPromptImage
      root={{ ref }}
      {...plasmicProps}
      overrides={{ img, closeIconContainer }}
    />
  );
}

export const CopilotPromptImage = React.forwardRef(CopilotPromptImage_);
