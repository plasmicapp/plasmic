import CommentPost from "@/wab/client/components/comments/CommentPost";
import { TplCommentThread } from "@/wab/client/components/comments/utils";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { observer } from "mobx-react";
import * as React from "react";

export default observer(function RootComment({
  commentThread,
}: {
  commentThread: TplCommentThread;
}) {
  const studioCtx = useStudioCtx();
  const [comment] = commentThread.comments;
  const threadId = commentThread.id;

  return (
    <CommentPost
      comment={comment}
      commentThread={commentThread}
      subjectLabel={commentThread.label}
      isThread
      repliesLinkLabel={
        commentThread.comments.length > 1
          ? `${commentThread.comments.length - 1} replies`
          : "Reply"
      }
      onClick={async () => {
        studioCtx.commentsCtx.openCommentThreadDialog(commentThread.id);
      }}
    />
  );
});
