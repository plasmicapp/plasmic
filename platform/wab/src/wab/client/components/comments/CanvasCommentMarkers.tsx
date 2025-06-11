import { CanvasTransformedBox } from "@/wab/client/components/canvas/CanvasTransformedBox";
import { useRerenderOnUserBodyChange } from "@/wab/client/components/canvas/UserBodyObserver";
import { AddCommentMarker } from "@/wab/client/components/comments/AddCommentMarker";
import { CommentMarker } from "@/wab/client/components/comments/CommentMarker";
import CommentPost from "@/wab/client/components/comments/CommentPost";
import {
  getSubjectVariantsKey,
  TplCommentThread,
} from "@/wab/client/components/comments/utils";
import { Avatar } from "@/wab/client/components/studio/Avatar";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  getSetOfPinnedVariantsForViewCtx,
  ViewCtx,
} from "@/wab/client/studio-ctx/view-ctx";
import { AnyArena } from "@/wab/shared/Arenas";
import { ensure, ensureString, withoutNils } from "@/wab/shared/common";
import {
  isTplNamable,
  isTplVariantable,
  tryGetTplOwnerComponent,
} from "@/wab/shared/core/tpls";
import { ArenaFrame, ObjInst, TplNode } from "@/wab/shared/model/classes";
import { mkSemVerSiteElement } from "@/wab/shared/site-diffs";
import { Popover, Tooltip } from "antd";
import $ from "jquery";
import { observer } from "mobx-react";
import React, { ReactNode } from "react";
import { createPortal } from "react-dom";

const HORIZONTAL_MARKER_OFFSET = 12;
const ADD_COMMENT_MARKER_MARGIN = 10;
const ADD_COMMENT_INDIVIDUAL_MARKER_MARGIN = 20;
const COMMENT_MARKER_INITIAL_Z_INDEX = 12;
const THREAD_MARKER_MARGIN = 30;

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
  offsetRight: number;
  zIndex: number;
  onHoverChange: (hovering: boolean) => void;
}) {
  const { commentThread, viewCtx, offsetRight, zIndex, onHoverChange } = props;
  const commentsCtx = viewCtx.studioCtx.commentsCtx;

  const threadComments = commentThread.comments;
  const [comment] = threadComments;
  const openedThread = commentsCtx.openedThread();
  const subject = commentsCtx
    .bundler()
    .objByAddr(commentThread.location.subject) as TplNode;
  const author = ensure(
    commentsCtx.computedData().usersMap.get(ensureString(comment.createdById)),
    "Comment author should exist"
  );
  const isSelected = openedThread?.threadId === commentThread.id;

  return (
    <CanvasCommentOverlay
      offsetRight={offsetRight}
      tpl={subject}
      viewCtx={viewCtx}
      className={"CommentMarker"}
      onClick={(e) => {
        if (!isSelected) {
          e.stopPropagation();
          commentsCtx.openCommentThreadDialog(commentThread.id, viewCtx);
        }
      }}
      zIndex={zIndex}
    >
      <Popover
        key={isSelected ? "selected" : `${comment.id}-not-selected`}
        overlayClassName={"NoPaddingPopover NoBackgroundStyles"}
        placement={"top"}
        trigger={["hover"]}
        destroyTooltipOnHide
        showArrow={false}
        content={
          !isSelected ? (
            <CommentPost
              comment={comment}
              commentThread={commentThread}
              subjectLabel={<ObjInstLabel subject={subject} />}
              hoverBox
              repliesLinkLabel={
                threadComments.length > 1
                  ? `${threadComments.length - 1} replies`
                  : null
              }
            />
          ) : null
        }
      >
        <div
          onMouseEnter={() => onHoverChange(true)}
          onMouseLeave={() => onHoverChange(false)}
        >
          <CommentMarker className={"CommentMarkerInitial"}>
            <Avatar user={author} size="small" showToolTip={false} />
          </CommentMarker>
        </div>
      </Popover>
    </CanvasCommentOverlay>
  );
});

export const CanvasAddCommentMarker = observer(
  function CanvasAddCommentMarker(props: { viewCtx: ViewCtx; tpl: TplNode }) {
    const { viewCtx, tpl } = props;
    const commentsCtx = viewCtx.studioCtx.commentsCtx;
    const commentStats = commentsCtx.computedData().commentStatsByVariant;
    const spotlightComponent = viewCtx?.currentComponentCtx()?.component();
    const ownerComponent = tryGetTplOwnerComponent(tpl);
    const isRecording = viewCtx.isEditingNonBaseVariant;

    // Don't show the add comment marker if the component is in spotlight mode
    // and is a child of the spotlighted component.
    const isSpotlightChild = ownerComponent === spotlightComponent;

    if (!ownerComponent || !isTplNamable(tpl) || isSpotlightChild) {
      return null;
    }

    const variants = getSetOfPinnedVariantsForViewCtx(
      viewCtx,
      viewCtx.bundler()
    );

    const offsetRight =
      (commentStats.get(getSubjectVariantsKey(tpl, variants))?.commentCount ||
        0) * HORIZONTAL_MARKER_OFFSET;
    return (
      <CanvasCommentOverlay
        tpl={tpl}
        viewCtx={viewCtx}
        className={"AddCommentMarker"}
        offsetRight={
          // push the add comment marker to right if comment marker any exist
          offsetRight
            ? THREAD_MARKER_MARGIN + offsetRight + ADD_COMMENT_MARKER_MARGIN
            : ADD_COMMENT_INDIVIDUAL_MARKER_MARGIN
        }
      >
        <Tooltip title="New comment">
          <AddCommentMarker
            isRecording={isRecording}
            icon={{
              onClick: (e) => {
                e.stopPropagation();
                commentsCtx.openNewCommentDialog(viewCtx, tpl);
              },
            }}
          />
        </Tooltip>
      </CanvasCommentOverlay>
    );
  }
);

const CanvasSubjectCommentMarkers = observer(
  function CanvasSubjectCommentMarkers({
    subjectCommentThreads,
    viewCtx,
  }: {
    subjectCommentThreads: TplCommentThread[];
    viewCtx: ViewCtx;
  }) {
    const [hoveredThreadId, setHoveredThreadId] = React.useState<string | null>(
      null
    );
    const commentsCtx = viewCtx.studioCtx.commentsCtx;
    const openedThreadId = commentsCtx.openedThread()?.threadId;

    const focusedIndex = subjectCommentThreads.findIndex(
      (t) => t.id === (hoveredThreadId ?? openedThreadId)
    );

    return (
      <>
        {subjectCommentThreads.map((commentThread, index, arr) => {
          let zIndex;
          if (focusedIndex === -1) {
            // No hover or selection — use base decreasing z-index
            zIndex = COMMENT_MARKER_INITIAL_Z_INDEX + arr.length - index;
          } else {
            // Calculate relative to the focused (hovered/selected) index
            const distance = Math.abs(index - focusedIndex);
            zIndex = arr.length + COMMENT_MARKER_INITIAL_Z_INDEX - distance;
          }

          return (
            <CanvasCommentMarker
              key={commentThread.id}
              offsetRight={
                THREAD_MARKER_MARGIN + index * HORIZONTAL_MARKER_OFFSET
              }
              zIndex={zIndex}
              commentThread={commentThread}
              viewCtx={viewCtx}
              onHoverChange={(hovering) =>
                setHoveredThreadId(hovering ? commentThread.id : null)
              }
            />
          );
        })}
      </>
    );
  }
);

export const CanvasCommentMarkers = observer(function CanvasCommentMarkers({
  arenaFrame,
}: {
  arena: AnyArena;
  arenaFrame: ArenaFrame;
}) {
  const studioCtx = useStudioCtx();
  const viewCtx = studioCtx.tryGetViewCtxForFrame(arenaFrame);
  const commentsCtx = studioCtx.commentsCtx;
  const focusedTpls = withoutNils(viewCtx?.focusedTpls() ?? []);

  useRerenderOnUserBodyChange(studioCtx, viewCtx);

  const shouldHideCommentMarker =
    studioCtx.shouldHideUIOverlay() || !viewCtx || !viewCtx.isVisible();

  if (shouldHideCommentMarker) {
    return null;
  }

  const threadsGroupedBySubject =
    commentsCtx.getThreadsGroupedBySubjectForViewCtx(viewCtx);

  return (
    <>
      {focusedTpls.map((tpl) => (
        <CanvasAddCommentMarker key={tpl.uuid} viewCtx={viewCtx} tpl={tpl} />
      ))}
      {[...threadsGroupedBySubject.entries()].map(
        ([subjectKey, subjectCommentThreads]) => (
          <CanvasSubjectCommentMarkers
            key={subjectKey}
            subjectCommentThreads={subjectCommentThreads}
            viewCtx={viewCtx}
          />
        )
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
  offsetRight,
  zIndex = COMMENT_MARKER_INITIAL_Z_INDEX,
}: {
  tpl: TplNode;
  children?: ReactNode;
  viewCtx: ViewCtx;
  onClick?: (e: any) => void;
  className?: string;
  offsetRight: number;
  zIndex?: number;
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

  return createPortal(
    <CanvasTransformedBox
      relativeTo={"arena"}
      $elt={$elt}
      viewCtx={viewCtx}
      style={{ zIndex }}
      className="ElementHighlightBoxContainer"
    >
      <div
        className={className}
        onClick={onClick}
        style={{
          right: `calc(0% - ${offsetRight}px)`,
        }}
      >
        {children}
      </div>
    </CanvasTransformedBox>,
    ensure(document.querySelector(".canvas-editor__scaler"), "")
  );
});
