import CommentPostForm from "@/wab/client/components/comments/CommentPostForm";
import {
  DefaultThreadCommentsDialogProps,
  PlasmicThreadCommentsDialog,
} from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicThreadCommentsDialog";
import {
  canUpdateHistory,
  useStudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { summarizeTpl } from "@/wab/shared/core/tpls";
import { observer } from "mobx-react";
import * as React from "react";

export type ThreadCommentsDialogProps = DefaultThreadCommentsDialogProps;

export const ThreadCommentsDialog = observer(function ThreadCommentsDialog(
  props: ThreadCommentsDialogProps
) {
  const studioCtx = useStudioCtx();
  const commentsCtx = studioCtx.commentsCtx;
  const viewCtx = commentsCtx.openedViewCtx();

  const selectedThread = React.useMemo(
    () =>
      commentsCtx
        .computedData()
        .allThreads.find((t) => t.id === commentsCtx.openedThreadId()),
    [commentsCtx.computedData().allThreads, commentsCtx.openedThreadId()]
  );

  const threadSubject = selectedThread?.subject;

  if (!threadSubject || !viewCtx) {
    return null;
  }

  const canUpdateThreadHistory = canUpdateHistory(studioCtx, selectedThread);

  return (
    <div className="CommentDialogContainer">
      <PlasmicThreadCommentsDialog
        commentsDialogHead={{
          close: {
            onClick: () => commentsCtx.closeCommentDialogs(),
          },
          commentsHeader: {
            name: threadSubject.name || "Unnamed",
            type: summarizeTpl(
              threadSubject,
              viewCtx.effectiveCurrentVariantSetting(threadSubject).rsh()
            ),
          },
          canUpdateHistory: canUpdateThreadHistory,
          threadHistoryStatus: {
            commentThread: selectedThread,
          },
        }}
        threadComments={{
          commentThread: selectedThread,
        }}
        replyForm={{
          render: () => <CommentPostForm threadId={selectedThread.id} />,
        }}
        {...props}
      />
    </div>
  );
});
