import CommentPost from "@/wab/client/components/comments/CommentPost";
import { TplComment } from "@/wab/client/components/comments/utils";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { CommentThreadId } from "@/wab/shared/ApiSchema";
import { observer } from "mobx-react";
import * as React from "react";

export default observer(function RootComment({
  threadComments,
  onThreadSelect,
}: {
  threadComments: TplComment[];
  onThreadSelect: (threadId: CommentThreadId) => void;
}) {
  const studioCtx = useStudioCtx();
  const [comment] = threadComments;
  const threadId = comment.threadId;

  return (
    <CommentPost
      comment={comment}
      subjectLabel={comment.label}
      isThread
      isRootComment
      repliesLinkLabel={
        threadComments.length > 1
          ? `${threadComments.length - 1} replies`
          : "Reply"
      }
      onClick={async () => {
        const ownerComponent = studioCtx
          .tplMgr()
          .findComponentContainingTpl(comment.subject);
        if (ownerComponent) {
          await studioCtx.setStudioFocusOnTpl(ownerComponent, comment.subject);
          studioCtx.centerFocusedFrame(1);
        }
        onThreadSelect(threadId);
      }}
    />
  );
});
