import CommentPost from "@/wab/client/components/comments/CommentPost";
import { TplCommentThread } from "@/wab/client/components/comments/utils";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { CommentThreadId } from "@/wab/shared/ApiSchema";
import { observer } from "mobx-react";
import * as React from "react";

export default observer(function RootComment({
  commentThread,
  onThreadSelect,
}: {
  commentThread: TplCommentThread;
  onThreadSelect: (threadId: CommentThreadId, viewCtx: ViewCtx) => void;
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
        const ownerComponent = studioCtx
          .tplMgr()
          .findComponentContainingTpl(commentThread.subject);

        if (ownerComponent) {
          await studioCtx.setStudioFocusOnTpl(
            ownerComponent,
            commentThread.subject,
            commentThread.variants
          );
          const focusedViewCtx = studioCtx.focusedViewCtx();
          if (focusedViewCtx) {
            onThreadSelect(threadId, focusedViewCtx);
          }
          studioCtx.tryZoomToFitSelection();
        }
      }}
    />
  );
});
