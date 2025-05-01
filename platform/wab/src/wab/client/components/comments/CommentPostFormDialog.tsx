import {
  DefaultCommentPostFormDialogProps,
  PlasmicCommentPostFormDialog,
} from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicCommentPostFormDialog";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { OnClickAway } from "@/wab/commons/components/OnClickAway";
import { summarizeTpl } from "@/wab/shared/core/tpls";
import { observer } from "mobx-react";
import * as React from "react";

export type CommentPostFormDialogProps = DefaultCommentPostFormDialogProps;

export const CommentPostFormDialog = observer(function CommentPostFormDialog(
  props: CommentPostFormDialogProps
) {
  const studioCtx = useStudioCtx();

  const commentsCtx = studioCtx.commentsCtx;
  const openedNewThread = commentsCtx.openedNewThread();

  if (!openedNewThread) {
    return null;
  }

  const handleClickOutside = () => {
    if (!openedNewThread?.interacted) {
      commentsCtx.closeCommentDialogs();
    }
  };

  const markThreadAsInteracted = () => {
    openedNewThread.interacted = true;
  };

  const threadSubject = openedNewThread.tpl;

  return (
    <OnClickAway onDone={handleClickOutside}>
      <div
        className="CommentDialogContainer"
        onClick={markThreadAsInteracted}
        onKeyDown={markThreadAsInteracted}
      >
        <PlasmicCommentPostFormDialog
          {...props}
          commentsDialogHead={{
            close: {
              onClick: () => commentsCtx.closeCommentDialogs(),
            },
            commentsHeader: {
              name: threadSubject.name || "Unnamed",
              type: summarizeTpl(
                threadSubject,
                openedNewThread.viewCtx
                  .effectiveCurrentVariantSetting(threadSubject)
                  .rsh()
              ),
            },
          }}
        />
      </div>
    </OnClickAway>
  );
});
