import { Icon } from "@/wab/client/components/widgets/Icon";
import SpeechBubblesvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__SpeechBubbleSvg";
import { Tooltip } from "antd";
import * as React from "react";

export default function CommentIndicatorIcon({
  commentCount,
  replyCount,
}: {
  commentCount: number;
  replyCount: number;
}) {
  let title = `${commentCount} ${commentCount > 1 ? "comments" : "comment"}`;
  if (replyCount > 0) {
    title += ` and ${replyCount} ${replyCount > 1 ? "replies" : "reply"}`;
  }
  return (
    <Tooltip title={title}>
      <Icon icon={SpeechBubblesvgIcon} />
    </Tooltip>
  );
}
