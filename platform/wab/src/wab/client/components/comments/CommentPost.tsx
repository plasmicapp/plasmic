import { ReactionsByEmoji } from "@/wab/client/components/comments/ReactionsByEmoji";
import { TplCommentThread } from "@/wab/client/components/comments/utils";
import { Avatar } from "@/wab/client/components/studio/Avatar";
import { ClickStopper } from "@/wab/client/components/widgets";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultCommentPostProps,
  PlasmicCommentPost,
} from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicCommentPost";
import {
  canUpdateHistory,
  isUserProjectOwner,
  useStudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import { ApiComment } from "@/wab/shared/ApiSchema";
import { fullName } from "@/wab/shared/ApiSchemaUtil";
import { ensure, ensureString, maybe } from "@/wab/shared/common";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { Menu } from "antd";
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

function CommentMenuOptions(props: {
  comment: ApiComment;
  isThread?: boolean;
  commentThread: TplCommentThread;
  onEdit?: (comment: ApiComment) => void;
}) {
  const { comment, isThread, commentThread, onEdit } = props;

  const studioCtx = useStudioCtx();
  const appCtx = useAppCtx();
  const api = appCtx.api;

  const isOwner = isUserProjectOwner(
    appCtx.selfInfo,
    studioCtx.siteInfo,
    studioCtx.siteInfo.perms
  );

  const commentsCtx = studioCtx.commentsCtx;
  const branchId = commentsCtx.branchId();
  const projectId = commentsCtx.projectId();

  return (
    <Menu>
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
    commentThread,
    ...rest
  } = props;

  const [isEditing, setIsEditing] = React.useState(false);

  const studioCtx = useStudioCtx();
  const appCtx = studioCtx.appCtx;
  const api = appCtx.api;
  const commentsCtx = studioCtx.commentsCtx;

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
      body={<StandardMarkdown>{comment.body}</StandardMarkdown>}
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
          menu: (
            <CommentMenuOptions
              comment={comment}
              isThread={isThread}
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
