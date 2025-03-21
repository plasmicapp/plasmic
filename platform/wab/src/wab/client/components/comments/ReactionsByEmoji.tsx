import { Icon as IconComponent } from "@/wab/client/components/widgets/Icon";
import IconButton from "@/wab/client/components/widgets/IconButton";
import PlasmicReactionButton from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicReactionButton";
import EmojiPlusSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__EmojiPlusSvg";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { OnClickAway } from "@/wab/commons/components/OnClickAway";
import { ApiCommentReaction, CommentId } from "@/wab/shared/ApiSchema";
import { fullName } from "@/wab/shared/ApiSchemaUtil";
import { ensure } from "@/wab/shared/common";
import { Tooltip } from "antd";
import Popover from "antd/lib/popover";
import EmojiPicker, { Emoji } from "emoji-picker-react";
import { Dictionary } from "lodash";
import * as React from "react";

// Reactions using unicode emojis hex codes
const REACTIONS = [
  "1f44d", // 👍
  "1f44f", // 👏
  "1f4af", // 💯
  "2705", // ✅
  "1f525", // 🔥
  "274c", // ❌
  "1f44e", // 👎
];

function ReactionsPopover(props: { commentId: CommentId }) {
  const { commentId } = props;
  const studioCtx = useStudioCtx();
  const appCtx = studioCtx.appCtx;
  const api = appCtx.api;

  const commentsCtx = studioCtx.commentsCtx;
  const [showPicker, setShowPicker] = React.useState(false);
  return (
    <Popover
      trigger={[]}
      showArrow={false}
      open={showPicker}
      onOpenChange={(x) => setShowPicker(x)}
      overlayClassName={"NoPaddingPopover NoBackgroundStyles"}
      content={
        <div>
          <OnClickAway onDone={() => setShowPicker(false)}>
            <div onClick={(e) => e.stopPropagation()}>
              <EmojiPicker
                reactionsDefaultOpen
                allowExpandReactions={false}
                reactions={REACTIONS}
                onEmojiClick={async (emoji) => {
                  await api.addReactionToComment(
                    commentsCtx.projectId(),
                    commentsCtx.branchId(),
                    commentId,
                    {
                      emojiName: emoji.unified,
                    }
                  );

                  setShowPicker(false);
                }}
              />
            </div>
          </OnClickAway>
        </div>
      }
    >
      <IconButton
        className="ReactionBtn"
        type="round"
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          setShowPicker(true);
        }}
      >
        <IconComponent icon={EmojiPlusSvgIcon} />
      </IconButton>
    </Popover>
  );
}

export function ReactionsByEmoji(props: {
  commentId: CommentId;
  reactionsByEmoji: Dictionary<ApiCommentReaction[]>;
}) {
  const { commentId, reactionsByEmoji } = props;

  const studioCtx = useStudioCtx();
  const appCtx = studioCtx.appCtx;
  const api = appCtx.api;

  const commentsCtx = studioCtx.commentsCtx;

  return (
    <>
      {Object.entries(reactionsByEmoji).map(([emojiName, reactions]) => {
        const currentUsersReaction = reactions.find(
          (r) => r.createdById === appCtx.selfInfo?.id
        );
        return (
          <Tooltip
            key={emojiName}
            title={reactions
              .map((r) =>
                fullName(
                  ensure(
                    commentsCtx
                      .computedData()
                      .usersMap.get(ensure(r.createdById, "")),
                    ""
                  )
                )
              )
              .join(", ")}
          >
            <PlasmicReactionButton
              includesSelf={!!currentUsersReaction}
              emoji={<Emoji size={20} unified={emojiName} />}
              count={<>{reactions.length}</>}
              onClick={async (e) => {
                e.stopPropagation();
                const projectId = commentsCtx.projectId();
                const branchId = commentsCtx.branchId();
                if (currentUsersReaction) {
                  await api.removeReactionFromComment(
                    projectId,
                    branchId,
                    currentUsersReaction.id
                  );
                } else {
                  await api.addReactionToComment(
                    projectId,
                    branchId,
                    commentId,
                    {
                      emojiName,
                    }
                  );
                }
              }}
            />
          </Tooltip>
        );
      })}
      <ReactionsPopover commentId={commentId} />
    </>
  );
}
