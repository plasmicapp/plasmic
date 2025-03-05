import CommentPostForm from "@/wab/client/components/comments/CommentPostForm";
import ThreadComments from "@/wab/client/components/comments/ThreadComments";
import { Dialog } from "@/wab/client/components/widgets/Dialog";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { IconButton } from "@/wab/client/components/widgets/IconButton";
import CloseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Close";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { isTplNamable, summarizeTplNamable } from "@/wab/shared/core/tpls";
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
  const viewCtx = commentsCtx.openViewCtx();

  const selectedThread = React.useMemo(
    () =>
      commentsCtx
        .computedData()
        .allThreads.find((t) => t.id === commentsCtx.openThreadId()),
    [commentsCtx.computedData().allThreads, commentsCtx.openThreadId()]
  );

  const focusedTpl = selectedThread?.subject || commentsCtx.openThreadTpl();

  if (!focusedTpl || !isTplNamable(focusedTpl)) {
    return null;
  }

  return (
    <div className="CommentModal">
      <Dialog
        heading={
          <>
            {focusedTpl && viewCtx
              ? summarizeTplNamable(
                  focusedTpl,
                  viewCtx.effectiveCurrentVariantSetting(focusedTpl).rsh()
                )
              : undefined}
            <IconButton
              type="seamless"
              className="flex-push-right"
              onClick={() => commentsCtx.closeCommentDialogs()}
            >
              <Icon icon={CloseIcon} />
            </IconButton>
          </>
        }
        showFooter={false}
        content={
          selectedThread ? (
            <ThreadComments commentThread={selectedThread} />
          ) : (
            <CommentPostForm />
          )
        }
      />
    </div>
  );
});
