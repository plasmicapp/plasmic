import CommentPostForm from "@/wab/client/components/comments/CommentPostForm";
import {
  DefaultThreadCommentsDialogProps,
  PlasmicThreadCommentsDialog,
} from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicThreadCommentsDialog";
import { OpenedThread } from "@/wab/client/studio-ctx/comments-ctx";
import {
  canUpdateHistory,
  useStudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { OnClickAway } from "@/wab/commons/components/OnClickAway";
import { ensure } from "@/wab/shared/common";
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
      ensure(
        commentsCtx
          .computedData()
          .allThreads.find((t) => t.id === openedThread.threadId),
        "could not find opened thread"
      ),
    [commentsCtx.computedData().allThreads, openedThread.threadId]
  );
  const threadSubject = selectedThread.subject;

  const handleClickOutside = () => {
    if (!openedThread.interacted) {
      commentsCtx.closeCommentDialogs();
    }
  };

  const markThreadAsInteracted = () => {
    openedThread.interacted = true;
  };

  const canUpdateThreadHistory = canUpdateHistory(studioCtx, selectedThread);

  return (
    <OnClickAway onDone={handleClickOutside}>
      <div
        className="CommentDialogContainer"
        onClick={markThreadAsInteracted}
        onKeyDown={markThreadAsInteracted}
      >
        <PlasmicThreadCommentsDialog
          commentsDialogHead={{
            close: {
              onClick: () => commentsCtx.closeCommentDialogs(),
            },
            commentsHeader: {
              name: threadSubject.name || "Unnamed",
              type: summarizeTpl(
                threadSubject,
                openedThread?.viewCtx
                  .effectiveCurrentVariantSetting(threadSubject)
                  .rsh()
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
            render: () => (
              <CommentPostForm
                id={selectedThread.id}
                defaultValue={""}
                onSubmit={(value: string) => {
                  commentsCtx.postThreadComment(selectedThread.id, {
                    body: value,
                  });
                }}
              />
            ),
          }}
          {...props}
        />
      </div>
    </OnClickAway>
  );
});
