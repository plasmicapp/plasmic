import CommentPostForm from "@/wab/client/components/comments/CommentPostForm";
import {
  DefaultCommentPostFormDialogProps,
  PlasmicCommentPostFormDialog,
} from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicCommentPostFormDialog";
import { OpenedNewThread } from "@/wab/client/studio-ctx/comments-ctx";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { getSetOfPinnedVariantsForViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { OnClickAway } from "@/wab/commons/components/OnClickAway";
import { ensure } from "@/wab/shared/common";
import { summarizeTpl } from "@/wab/shared/core/tpls";
import { observer } from "mobx-react";
import * as React from "react";

export type CommentPostFormDialogProps = DefaultCommentPostFormDialogProps & {
  openedNewThread: OpenedNewThread;
};

export const CommentPostFormDialog = observer(function CommentPostFormDialog({
  openedNewThread,
  ...props
}: CommentPostFormDialogProps) {
  const studioCtx = useStudioCtx();

  const commentsCtx = studioCtx.commentsCtx;

  const handleClickOutside = () => {
    if (!openedNewThread.interacted) {
      commentsCtx.closeNewThreadDialog();
    }
  };

  const markThreadAsInteracted = () => {
    openedNewThread.interacted = true;
  };
  const currentArena = ensure(
    studioCtx.currentArena,
    "Current arena should exist"
  );

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
              onClick: () => commentsCtx.closeNewThreadDialog(),
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
          commentPostForm={{
            render: () => (
              <CommentPostForm
                id={"new"}
                defaultValue={commentsCtx.getArenaDraft(currentArena)}
                onSubmit={(value: string) => {
                  const location = {
                    subject: commentsCtx
                      .bundler()
                      .addrOf(ensure(openedNewThread.tpl, "")),
                    variants: getSetOfPinnedVariantsForViewCtx(
                      ensure(openedNewThread.viewCtx, ""),
                      commentsCtx.bundler()
                    ).map((pv) => commentsCtx.bundler().addrOf(pv)),
                  };
                  commentsCtx.postRootComment({
                    body: value,
                    location,
                  });
                  commentsCtx.clearArenaDraft(currentArena);
                  commentsCtx.closeNewThreadDialog();
                }}
                onChange={(value) =>
                  commentsCtx.setArenaDraft(currentArena, value)
                }
              />
            ),
          }}
        />
      </div>
    </OnClickAway>
  );
});
