import { Icon } from "@/wab/client/components/widgets/Icon";
import SpeechBubblesvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__SpeechBubbleSvg";
import { Tooltip } from "antd";
import * as React from "react";

export default function CommentIndicatorIcon({
  commentCount,
  replyCount,
  otherVariantsCount,
}: {
  commentCount: number;
  replyCount: number;
  otherVariantsCount?: number;
}) {
  let title = `${commentCount} ${commentCount > 1 ? "comments" : "comment"}`;
  if (replyCount > 0) {
    title += ` and ${replyCount} ${replyCount > 1 ? "replies" : "reply"}`;
  }

  if (otherVariantsCount) {
    title += `, (${otherVariantsCount}) ${
      otherVariantsCount > 1 ? "comments" : "comment"
    } in other variants`;
  }

  return (
    <Tooltip title={title}>
      <Icon icon={SpeechBubblesvgIcon} />
    </Tooltip>
  );
}
