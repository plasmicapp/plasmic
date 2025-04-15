import {
  DefaultCommentPostFormDialogProps,
  PlasmicCommentPostFormDialog,
} from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicCommentPostFormDialog";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
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

  const threadSubject = openedNewThread.tpl;

  return (
    <div className="CommentDialogContainer">
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
  );
});
