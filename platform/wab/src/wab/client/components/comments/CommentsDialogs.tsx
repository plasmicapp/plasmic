import { CommentPostFormDialog } from "@/wab/client/components/comments/CommentPostFormDialog";
import { ThreadCommentsDialog } from "@/wab/client/components/comments/ThreadCommentsDialog";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { observer } from "mobx-react";
import * as React from "react";

export type CommentsTabProps = {
  studioCtx: StudioCtx;
};

export const CommentsDialogs = observer(function CommentsDialogs(
  props: CommentsTabProps
) {
  const { studioCtx } = props;

  const commentsCtx = studioCtx.commentsCtx;

  const thread = commentsCtx.openedThread();
  if (thread) {
    return <ThreadCommentsDialog openedThread={thread} />;
  }

  const newThread = commentsCtx.openedNewThread();
  if (newThread) {
    return <CommentPostFormDialog openedNewThread={newThread} />;
  }

  return null;
});
