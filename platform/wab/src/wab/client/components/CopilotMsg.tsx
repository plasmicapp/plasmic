import styles from "@/wab/client/components/CopilotMsg.module.scss";
import { TextboxRef } from "@/wab/client/components/widgets/Textbox";
import {
  DefaultCopilotMsgProps,
  PlasmicCopilotMsg,
  PlasmicCopilotMsg__OverridesType,
} from "@/wab/client/plasmic/plasmic_kit_data_binding/PlasmicCopilotMsg";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { assert, maybe, spawn } from "@/wab/common";
import { CopilotInteractionId } from "@/wab/shared/ApiSchema";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

export interface CopilotMsgProps
  extends DefaultCopilotMsgProps,
    PlasmicCopilotMsg__OverridesType {
  copilotInteractionId?: CopilotInteractionId;
}

function CopilotMsg_(
  { copilotInteractionId, ...props }: CopilotMsgProps,
  ref: HTMLElementRefOf<"div">
) {
  const studioCtx = useStudioCtx();
  const savedFeedback =
    copilotInteractionId && studioCtx.getCopilotFeedback(copilotInteractionId);
  const isFeedbackAlreadySaved = savedFeedback != null;
  const feedbackTextboxRef = React.useRef<TextboxRef>(null);

  const [feedbackStatus, setFeedbackStatus] = React.useState<
    "submit" | "submitting" | "submitted"
  >();
  const [likeDislikeState, setLikeDislikeState] = React.useState<
    "like" | "dislike" | undefined
  >(maybe(savedFeedback, (like) => (like ? "like" : "dislike")));
  const [feedbackDescription, setFeedbackDescription] = React.useState("");

  return (
    <PlasmicCopilotMsg
      root={{ ref }}
      {...props}
      copilotLikeDislike={{
        state: likeDislikeState,
        likeBtn: {
          onClick: () => {
            if (isFeedbackAlreadySaved) {
              return;
            }
            if (likeDislikeState === "like" && feedbackStatus === "submit") {
              setLikeDislikeState(undefined);
              setFeedbackStatus(undefined);
            } else if (
              likeDislikeState !== "like" &&
              (feedbackStatus == null || feedbackStatus === "submit")
            ) {
              setLikeDislikeState("like");
              setFeedbackStatus("submit");
              feedbackTextboxRef.current?.focus();
            }
          },
          ...(!isFeedbackAlreadySaved &&
            feedbackStatus === "submit" && { disabled: false }),
        },
        dislikeBtn: {
          onClick: () => {
            if (isFeedbackAlreadySaved) {
              return;
            }
            if (likeDislikeState === "dislike" && feedbackStatus === "submit") {
              setLikeDislikeState(undefined);
              setFeedbackStatus(undefined);
            } else if (
              likeDislikeState !== "dislike" &&
              (feedbackStatus == null || feedbackStatus === "submit")
            ) {
              setLikeDislikeState("dislike");
              setFeedbackStatus("submit");
              feedbackTextboxRef.current?.focus();
            }
          },
          ...(!isFeedbackAlreadySaved &&
            feedbackStatus === "submit" && { disabled: false }),
        },
      }}
      feedbackTextbox={{
        ref: feedbackTextboxRef,
        autoFocus: true,
        value: feedbackDescription,
        onChange: (e) => setFeedbackDescription(e.target.value),
        className: styles.forceGrayBackground,
      }}
      feedback={feedbackStatus}
      submitFeedbackBtn={{
        onClick: () => {
          if (feedbackStatus === "submit") {
            assert(
              likeDislikeState != null,
              () => `Should have pressed like or dislike`
            );
            assert(copilotInteractionId != null, () => `No interaction ID`);
            setFeedbackStatus("submitting");
            spawn(
              studioCtx
                .submitCopilotFeedback(
                  copilotInteractionId,
                  likeDislikeState === "like",
                  feedbackDescription || null
                )
                .then(() => setFeedbackStatus("submitted"))
            );
          }
        },
      }}
    />
  );
}

const CopilotMsg = React.forwardRef(CopilotMsg_);
export default CopilotMsg;
