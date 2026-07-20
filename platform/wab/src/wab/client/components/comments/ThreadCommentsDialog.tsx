import CommentPostForm from "@/wab/client/components/comments/CommentPostForm";
import { FloatingWindow } from "@/wab/client/components/widgets/FloatingWindow";
import {
  DefaultThreadCommentsDialogProps,
  PlasmicThreadCommentsDialog,
} from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicThreadCommentsDialog";
import {
  canUpdateHistory,
  useStudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { OpenedThread } from "@/wab/client/studio-ctx/comments-ctx";
import { OnClickAway } from "@/wab/commons/components/OnClickAway";
import { summarizeTpl } from "@/wab/shared/core/tpls";
import { observer } from "mobx-react";
import * as React from "react";

export type ThreadCommentsDialogProps = DefaultThreadCommentsDialogProps & {
  openedThread: OpenedThread;
};

export const ThreadCommentsDialog = observer(function ThreadCommentsDialog({
  openedThread,
  ...props
}: ThreadCommentsDialogProps) {
  const studioCtx = useStudioCtx();
  const commentsCtx = studioCtx.commentsCtx;

  const selectedThread = React.useMemo(
    () =>
      commentsCtx
        .computedData()
        .allThreads.find((t) => t.id === openedThread.threadId),
    [commentsCtx.computedData().allThreads, openedThread.threadId]
  );
  if (!selectedThread) {
    commentsCtx.closeCommentThreadDialog();
    return null;
  }
  const subjectInfo = selectedThread.subjectInfo;

  const handleClickOutside = () => {
    if (!openedThread.interacted) {
      commentsCtx.closeCommentThreadDialog();
    }
  };

  const markThreadAsInteracted = () => {
    openedThread.interacted = true;
  };

  const canUpdateThreadHistory = canUpdateHistory(studioCtx, selectedThread);

  return (
    <OnClickAway onDone={handleClickOutside}>
      <FloatingWindow
        handleSelector=".CommentDialogDragHandle"
        focusedMode={studioCtx.focusedMode}
        onClick={markThreadAsInteracted}
        onKeyDown={markThreadAsInteracted}
      >
        <PlasmicThreadCommentsDialog
          commentsDialogHead={{
            className: "CommentDialogDragHandle",
            close: {
              onClick: () => commentsCtx.closeCommentThreadDialog(),
              "data-test-id": "thread-comment-dialog-close-btn",
            },
            ...(subjectInfo
              ? {
                  name: subjectInfo.subject.name || "Unnamed element",
                  type: openedThread.viewCtx
                    ? summarizeTpl(
                        subjectInfo.subject,
                        openedThread.viewCtx
                          .effectiveCurrentVariantSetting(subjectInfo.subject)
                          .rsh()
                      )
                    : "",
                }
              : {
                  name: "Deleted element",
                  type: "",
                }),
            canUpdateHistory: canUpdateThreadHistory,
            threadHistoryStatus: {
              commentThread: selectedThread,
              "data-test-id": "thread-comment-dialog-history-btn",
            },
          }}
          threadComments={{
            commentThread: selectedThread,
          }}
          replyForm={{
            render: () => (
              <CommentPostForm
                id={selectedThread.id}
                defaultValue={commentsCtx.getThreadDraft(selectedThread)}
                onSubmit={(value: string) => {
                  commentsCtx.postThreadComment(selectedThread.id, {
                    body: value,
                  });
                  commentsCtx.clearThreadDraft(selectedThread);
                }}
                onChange={(value) =>
                  commentsCtx.setThreadDraft(selectedThread, value)
                }
              />
            ),
          }}
          {...props}
        />
      </FloatingWindow>
    </OnClickAway>
  );
});
