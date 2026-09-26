import {
  DefaultCopilotPromptImageProps,
  PlasmicCopilotPromptImage,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicCopilotPromptImage";
import { CopilotImage } from "@/wab/shared/ApiSchema";
import { asDataUrl } from "@/wab/shared/data-urls";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

export type CopilotPromptImageProps = DefaultCopilotPromptImageProps & {
  image: CopilotImage;
  onDelete: () => void;
};

function CopilotPromptImage_(
  props: CopilotPromptImageProps,
  ref: HTMLElementRefOf<"div">,
) {
  const { image, onDelete, ...plasmicProps } = props;
  const img = React.useMemo(
    () => ({ src: asDataUrl(image.base64, `image/${image.type}`, "base64") }),
    [image.base64, image.type],
  );
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
