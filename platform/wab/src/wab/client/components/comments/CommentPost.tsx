import { useCommentsCtx } from "@/wab/client/components/comments/CommentsProvider";
import { TplCommentThread } from "@/wab/client/components/comments/utils";
import { Avatar } from "@/wab/client/components/studio/Avatar";
import { ClickStopper } from "@/wab/client/components/widgets";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultCommentPostProps,
  PlasmicCommentPost,
} from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicCommentPost";
import PlasmicReactionButton from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicReactionButton";
import {
  isUserProjectContentEditor,
  isUserProjectOwner,
  useStudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import { OnClickAway } from "@/wab/commons/components/OnClickAway";
import {
  ApiComment,
  ApiCommentReaction,
  CommentId,
} from "@/wab/shared/ApiSchema";
import { fullName } from "@/wab/shared/ApiSchemaUtil";
import { ensure, ensureString, maybe } from "@/wab/shared/common";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { Menu, Tooltip } from "antd";
import Popover from "antd/lib/popover";
import EmojiPicker, { Emoji } from "emoji-picker-react";
import { Dictionary, groupBy } from "lodash";
import moment from "moment";
import * as React from "react";

export interface CommentPostProps extends DefaultCommentPostProps {
  comment: ApiComment;
  commentThread: TplCommentThread;
  subjectLabel?: React.ReactNode;
  repliesLinkLabel?: React.ReactNode;
  onClick?: () => void;
  isThread?: boolean;
  isRootComment?: boolean;
}

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

function ReactionsByEmoji(props: {
  commentId: CommentId;
  reactionsByEmoji: Dictionary<ApiCommentReaction[]>;
}) {
  const { commentId, reactionsByEmoji } = props;

  const appCtx = useAppCtx();
  const api = appCtx.api;

  const { projectId, branchId, usersMap } = useCommentsCtx();

  return (
    <>
      {Object.entries(reactionsByEmoji).map(([emojiName, reactions]) => {
        const currentUsersReaction = reactions.find(
          (r) => r.createdById === appCtx.selfInfo?.id
        );
        return (
          <Tooltip
            title={reactions
              .map((r) =>
                fullName(ensure(usersMap.get(ensure(r.createdById, "")), ""))
              )
              .join(", ")}
          >
            <PlasmicReactionButton
              includesSelf={!!currentUsersReaction}
              emoji={<Emoji size={20} unified={emojiName} />}
              count={<>{reactions.length}</>}
              onClick={async (e) => {
                e.stopPropagation();
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
    </>
  );
}

function CommentMenuOptions(props: {
  comment: ApiComment;
  isThread?: boolean;
  isRootComment?: boolean;
  commentThread: TplCommentThread;
  onEdit?: (comment: ApiComment) => void;
}) {
  const { comment, isThread, commentThread, isRootComment, onEdit } = props;

  const studioCtx = useStudioCtx();
  const appCtx = useAppCtx();
  const api = appCtx.api;

  const isContentEditor = isUserProjectContentEditor(
    appCtx.selfInfo,
    studioCtx.siteInfo,
    studioCtx.siteInfo.perms
  );

  const isOwner = isUserProjectOwner(
    appCtx.selfInfo,
    studioCtx.siteInfo,
    studioCtx.siteInfo.perms
  );

  const { projectId, branchId } = useCommentsCtx();

  return (
    <Menu>
      {isRootComment && (
        <Menu.Item
          key="change-status"
          disabled={
            !(isContentEditor || appCtx.selfInfo?.id === comment.createdById)
          }
          onClick={async () => {
            await api.editThread(projectId, branchId, comment.commentThreadId, {
              resolved: !commentThread.resolved,
            });
          }}
        >
          Mark as {commentThread.resolved ? "unresolved" : "resolved"}
        </Menu.Item>
      )}
      {!comment.deletedAt && !isThread && (
        <>
          <Menu.Item
            key="edit"
            disabled={!(isOwner || appCtx.selfInfo?.id === comment.createdById)}
            onClick={() => {
              onEdit?.(comment);
            }}
          >
            Edit comment
          </Menu.Item>
          <Menu.Item
            key="remove"
            disabled={!(isOwner || appCtx.selfInfo?.id === comment.createdById)}
            onClick={async () => {
              await api.deleteComment(projectId, branchId, comment.id);
            }}
          >
            Delete comment
          </Menu.Item>
        </>
      )}
    </Menu>
  );
}

function CommentPost_(props: CommentPostProps, ref: HTMLElementRefOf<"div">) {
  const {
    comment,
    subjectLabel,
    repliesLinkLabel,
    isThread,
    isRootComment = false,
    commentThread,
    ...rest
  } = props;

  const [isEditing, setIsEditing] = React.useState(false);

  const appCtx = useAppCtx();
  const api = appCtx.api;
  const { projectId, branchId, usersMap, reactionsByCommentId } =
    useCommentsCtx();

  const author = ensure(
    usersMap.get(ensureString(comment.createdById)),
    `Author of comment ${comment.createdById} should be present in usersMap`
  );

  const reactionsByEmoji =
    maybe(reactionsByCommentId.get(comment.id), (xs) =>
      groupBy(xs, (x) => x.data.emojiName)
    ) ?? {};

  const [showPicker, setShowPicker] = React.useState(false);
  const popoverTargetRef = React.useRef<HTMLDivElement>(null);

  return (
    <PlasmicCommentPost
      root={{ ref: popoverTargetRef }}
      {...rest}
      body={<StandardMarkdown>{comment.body}</StandardMarkdown>}
      isEditing={isEditing}
      commentPostForm={{
        isEditing,
        setIsEditing,
        editComment: comment,
      }}
      timestamp={moment(comment.createdAt).fromNow()}
      thread={isThread}
      userFullName={fullName(author)}
      repliesLink={{ children: repliesLinkLabel }}
      subjectLabel={{ children: subjectLabel }}
      avatarContainer={{ children: <Avatar user={author} /> }}
      reactionsContainer={{
        children: (
          <ReactionsByEmoji
            commentId={comment.id}
            reactionsByEmoji={reactionsByEmoji}
          />
        ),
      }}
      btnAddReaction={{
        render: (innerProps, Comp) => (
          <Popover
            trigger={[]}
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
                          projectId,
                          branchId,
                          comment.id,
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
            <Comp
              {...innerProps}
              onClick={(e) => {
                e.stopPropagation();
                setShowPicker(true);
              }}
            />
          </Popover>
        ),
      }}
      btnMore={{
        wrap: (node) => <ClickStopper preventDefault>{node}</ClickStopper>,
        props: {
          menu: (
            <CommentMenuOptions
              comment={comment}
              isThread={isThread}
              isRootComment={isRootComment}
              commentThread={commentThread}
              onEdit={() => {
                setIsEditing(true);
              }}
            />
          ),
        },
      }}
    />
  );
}

const CommentPost = React.forwardRef(CommentPost_);
export default CommentPost;
