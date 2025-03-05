import { CanvasTransformedBox } from "@/wab/client/components/canvas/CanvasTransformedBox";
import { useRerenderOnUserBodyChange } from "@/wab/client/components/canvas/UserBodyObserver";
import CommentPost from "@/wab/client/components/comments/CommentPost";
import {
  TplCommentThread,
  isCommentForFrame,
} from "@/wab/client/components/comments/utils";
import { Avatar } from "@/wab/client/components/studio/Avatar";
import {
  BASE_VARIANT_COLOR,
  NON_BASE_VARIANT_COLOR,
} from "@/wab/client/components/studio/GlobalCssVariables";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { AnyArena } from "@/wab/shared/Arenas";
import { ensure, ensureString, xGroupBy } from "@/wab/shared/common";
import { isTplVariantable } from "@/wab/shared/core/tpls";
import { ArenaFrame, ObjInst, TplNode } from "@/wab/shared/model/classes";
import { mkSemVerSiteElement } from "@/wab/shared/site-diffs";
import Chroma from "@/wab/shared/utils/color-utils";
import classNames from "classnames";
import $ from "jquery";
import { observer } from "mobx-react";
import React, { ReactNode } from "react";
import { createPortal } from "react-dom";

function ObjInstLabel(props: { subject: ObjInst }) {
  const { subject } = props;

  const item = mkSemVerSiteElement(subject as any);
  const typeName = item.type;
  const objName = item.name;
  return (
    <>
      {objName ? (
        <>
          {typeName} <strong>{objName}</strong>
        </>
      ) : (
        "Unnamed " + typeName
      )}
    </>
  );
}

const CanvasCommentMarker = observer(function CanvasCommentMarker(props: {
  commentThread: TplCommentThread;
  viewCtx: ViewCtx;
  offsetLeft: number;
}) {
  const { commentThread, viewCtx, offsetLeft } = props;
  const commentsCtx = viewCtx.studioCtx.commentsCtx;

  const threadComments = commentThread.comments;
  const [comment] = threadComments;
  const subject = commentsCtx
    .bundler()
    .objByAddr(commentThread.location.subject) as TplNode;
  const author = ensure(
    commentsCtx.computedData().usersMap.get(ensureString(comment.createdById)),
    "Comment author should exist"
  );
  const isSelected = commentsCtx.openThreadId() === commentThread.id;
  return (
    <CanvasCommentOverlay
      offsetLeft={offsetLeft}
      tpl={subject}
      viewCtx={viewCtx}
      className={"CommentMarker"}
      onClick={(e) => {
        if (!isSelected) {
          commentsCtx.openCommentThreadDialog(viewCtx, commentThread.id);
        }
      }}
      isSelected={isSelected}
    >
      <div className={"CommentMarkerInitial"}>
        <Avatar user={author} />
      </div>
      <div className={"CommentMarkerHover"}>
        <CommentPost
          comment={comment}
          commentThread={commentThread}
          subjectLabel={<ObjInstLabel subject={subject} />}
          isThread
          isRootComment
          repliesLinkLabel={
            threadComments.length > 1
              ? `${threadComments.length - 1} replies`
              : "Reply"
          }
        />
      </div>
    </CanvasCommentOverlay>
  );
});

export const CanvasCommentMarkers = observer(function CanvasCommentMarkers({
  arenaFrame,
}: {
  arena: AnyArena;
  arenaFrame: ArenaFrame;
}) {
  const studioCtx = useStudioCtx();

  const commentsCtx = studioCtx.commentsCtx;

  const viewCtx = studioCtx.tryGetViewCtxForFrame(arenaFrame);

  useRerenderOnUserBodyChange(studioCtx, viewCtx);

  const threadsGroupedBySubject = React.useMemo(
    () =>
      !viewCtx
        ? new Map()
        : xGroupBy(
            commentsCtx
              .computedData()
              .unresolvedThreads.filter((commentThread) =>
                isCommentForFrame(studioCtx, viewCtx, commentThread)
              ),
            (commentThread) => commentThread.subject.uuid
          ),
    [commentsCtx.computedData().unresolvedThreads, studioCtx, viewCtx]
  );

  if (!viewCtx) {
    return null;
  }

  return (
    <>
      {[...threadsGroupedBySubject.values()].map((subjectCommentThreads) =>
        subjectCommentThreads.map((commentThread, index) => (
          <CanvasCommentMarker
            offsetLeft={index * 20}
            key={commentThread.id}
            commentThread={commentThread}
            viewCtx={viewCtx}
          />
        ))
      )}
    </>
  );
});

export const CanvasCommentOverlay = observer(function CanvasCommentOverlay({
  tpl,
  children,
  viewCtx,
  onClick,
  className,
  isSelected,
  offsetLeft,
}: {
  tpl: TplNode;
  children?: ReactNode;
  viewCtx: ViewCtx;
  onClick?: (e: any) => void;
  className?: string;
  isSelected?: boolean;
  offsetLeft: number;
}) {
  // We directly use the render count here to make this component depend on it and re-render every time the render count changes
  // This is necessary for elements that are visible in the canvas conditionally (e.g. auto opened elements)
  const renderCount = viewCtx.renderCount;
  if (renderCount === 0) {
    return null;
  }

  const [_, doms] = viewCtx.maybeDomsForTpl(tpl, {
    ignoreFocusedCloneKey: true,
  });

  const $elt = $(doms ?? []);

  if (!$elt || $elt.length === 0) {
    return null;
  }

  const isTargetingSomeNonBaseVariant =
    isTplVariantable(tpl) &&
    viewCtx.variantTplMgr().isTargetingNonBaseVariant(tpl);

  const color = isTargetingSomeNonBaseVariant
    ? NON_BASE_VARIANT_COLOR
    : BASE_VARIANT_COLOR;

  return createPortal(
    <CanvasTransformedBox
      relativeTo={"arena"}
      $elt={$elt}
      viewCtx={viewCtx}
      className={classNames({
        "ElementHighlightBoxContainer CommentMarkerContainer": true,
        CommentMarkerContainerSelected: isSelected,
      })}
    >
      <div
        className={classNames({
          "ElementHighlightBoxRendered CommentMarkerOverlay": true,
        })}
        style={{
          borderColor: Chroma(color).alpha(0.1).css(),
          backgroundColor: Chroma(color).alpha(0.2).css(),
        }}
      />
      <div
        className={className}
        onClick={onClick}
        style={{
          left: `calc(100% - ${offsetLeft}px)`,
        }}
      >
        {children}
      </div>
    </CanvasTransformedBox>,
    ensure(document.querySelector(".canvas-editor__scaler"), "")
  );
});
