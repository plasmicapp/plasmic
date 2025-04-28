import { ReactionsByEmoji } from "@/wab/client/components/comments/ReactionsByEmoji";
import { TplCommentThread } from "@/wab/client/components/comments/utils";
import { Avatar } from "@/wab/client/components/studio/Avatar";
import { ClickStopper } from "@/wab/client/components/widgets";
import {
  DefaultCommentPostProps,
  PlasmicCommentPost,
} from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicCommentPost";
import {
  canUpdateHistory,
  useStudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import { ApiComment } from "@/wab/shared/ApiSchema";
import { fullName } from "@/wab/shared/ApiSchemaUtil";
import { ensure, ensureString, maybe } from "@/wab/shared/common";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { Menu } from "antd";
import copy from "copy-to-clipboard";
import { groupBy } from "lodash";
import moment from "moment";
import * as React from "react";

export interface CommentPostProps extends DefaultCommentPostProps {
  comment: ApiComment;
  commentThread: TplCommentThread;
  subjectLabel?: React.ReactNode;
  repliesLinkLabel?: React.ReactNode;
  onClick?: () => void;
  isThread?: boolean;
}

function CommentPost_(props: CommentPostProps, ref: HTMLElementRefOf<"div">) {
  const {
    comment,
    subjectLabel,
    repliesLinkLabel,
    isThread,
    commentThread,
    ...rest
  } = props;

  const [isEditing, setIsEditing] = React.useState(false);

  const studioCtx = useStudioCtx();
  const commentsCtx = studioCtx.commentsCtx;
  const appCtx = studioCtx.appCtx;

  const author = ensure(
    commentsCtx.computedData().usersMap.get(ensureString(comment.createdById)),
    `Author of comment ${comment.createdById} should be present in usersMap`
  );

  const reactionsByEmoji =
    maybe(
      commentsCtx.computedData().reactionsByCommentId.get(comment.id),
      (xs) => groupBy(xs, (x) => x.data.emojiName)
    ) ?? {};

  const popoverTargetRef = React.useRef<HTMLDivElement>(null);

  const canUpdateThreadHistory =
    isThread && canUpdateHistory(studioCtx, commentThread);

  return (
    <PlasmicCommentPost
      className="CommentPost"
      root={{ ref: popoverTargetRef }}
      {...rest}
      body={
        comment.deletedAt ? null : (
          <StandardMarkdown>{comment.body}</StandardMarkdown>
        )
      }
      isEditing={isEditing}
      isDeleted={Boolean(comment.deletedAt)}
      commentPostForm={{
        isEditing,
        editComment: comment,
        threadId: comment.commentThreadId,
        onSubmit: () => {
          setIsEditing(false);
        },
        onCancel: () => {
          setIsEditing(false);
        },
      }}
      canUpdateHistory={canUpdateThreadHistory}
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
      threadHistoryStatus={{
        commentThread,
      }}
      btnMore={{
        wrap: (node) => <ClickStopper preventDefault>{node}</ClickStopper>,
        props: {
          menu: () => (
            <Menu>
              <Menu.Item
                key="copy"
                onClick={() => {
                  copy(comment.body);
                }}
              >
                Copy text
              </Menu.Item>
              {appCtx.selfInfo?.id === comment.createdById && (
                <>
                  <Menu.Item
                    key="edit"
                    onClick={() => {
                      setIsEditing(true);
                    }}
                  >
                    Edit comment
                  </Menu.Item>
                  <Menu.Item
                    key="remove"
                    onClick={() => {
                      commentsCtx.deleteComment(comment.id);
                    }}
                  >
                    Delete comment
                  </Menu.Item>
                </>
              )}
            </Menu>
          ),
        },
      }}
    />
  );
}

const CommentPost = React.forwardRef(CommentPost_);
export default CommentPost;
