import {
  DefaultCopilotLikeDislikeProps,
  PlasmicCopilotLikeDislike,
  PlasmicCopilotLikeDislike__OverridesType,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicCopilotLikeDislike";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

export interface CopilotLikeDislikeProps
  extends DefaultCopilotLikeDislikeProps,
    PlasmicCopilotLikeDislike__OverridesType {}

function CopilotLikeDislike_(
  props: CopilotLikeDislikeProps,
  ref: HTMLElementRefOf<"div">
) {
  return <PlasmicCopilotLikeDislike root={{ ref }} {...props} />;
}

const CopilotLikeDislike = React.forwardRef(CopilotLikeDislike_);
export default CopilotLikeDislike;
