import { ArenaFrame, TplNode } from "@/wab/classes";
import { CanvasTransformedBox } from "@/wab/client/components/canvas/CanvasTransformedBox";
import { useRerenderOnUserBodyChange } from "@/wab/client/components/canvas/UserBodyObserver";
import { useCommentViews } from "@/wab/client/components/comments/CommentViews";
import { Avatar } from "@/wab/client/components/studio/Avatar";
import {
  BASE_VARIANT_COLOR,
  NON_BASE_VARIANT_COLOR,
} from "@/wab/client/components/studio/GlobalCssVariables";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  ensure,
  ensureString,
  xGroupBy,
  xSymmetricDifference,
} from "@/wab/common";
import { OnClickAway } from "@/wab/commons/components/OnClickAway";
import { ApiComment, CommentThreadId } from "@/wab/shared/ApiSchema";
import { AnyArena } from "@/wab/shared/Arenas";
import Chroma from "@/wab/shared/utils/color-utils";
import { isTplVariantable } from "@/wab/tpls";
import classNames from "classnames";
import $ from "jquery";
import { observer } from "mobx-react";
import React, { createContext, ReactNode, useContext } from "react";
import { createPortal } from "react-dom";

interface CommentOverlaysContextData {
  shownThreadId: CommentThreadId | undefined;
  setShownThreadId: (threadId: CommentThreadId | undefined) => any;
  shownArenaFrame: ArenaFrame | undefined;
  setShownArenaFrame: (threadId: ArenaFrame | undefined) => any;
}

export const CommentOverlaysContext = createContext<
  CommentOverlaysContextData | undefined
>(undefined);

export const CommentOverlays = observer(function CommentOverlays({
  arena,
  arenaFrame,
}: {
  arena: AnyArena;
  arenaFrame: ArenaFrame;
}) {
  const studioCtx = useStudioCtx();

  const {
    shownThreadId,
    setShownThreadId,
    shownArenaFrame,
    setShownArenaFrame,
  } = ensure(
    useContext(CommentOverlaysContext),
    "CommentOverlaysContext should exist here"
  );

  const viewCtx = studioCtx.tryGetViewCtxForFrame(arenaFrame);

  useRerenderOnUserBodyChange(studioCtx, viewCtx);

  const maybeCommentViews = useCommentViews(studioCtx, viewCtx);

  if (!maybeCommentViews || !viewCtx) {
    return null;
  }

  const {
    bundler,
    allComments,
    userMap,
    deriveLabel,
    renderComment,
    renderFullThread,
    getCurrentVariants,
  } = maybeCommentViews;

  function renderThread(threadComments: ApiComment[]) {
    const [comment] = threadComments;
    const subject = bundler.objByAddr(comment.data.location.subject);
    const isSelected = viewCtx?.focusedTpl() === subject;
    const label = deriveLabel(subject);

    const threadId = comment.data.threadId;

    return (
      <>
        <div>
          <h4 style={{ padding: "8px 16px" }}>{label}</h4>
          {renderFullThread(threadComments, threadId)}
        </div>
      </>
    );
  }

  function renderCommentMarker(threadComments: ApiComment[]) {
    const [comment] = threadComments;
    const subject = bundler.objByAddr(comment.data.location.subject) as TplNode;
    const author = ensure(userMap.get(ensureString(comment.createdById)), "");
    const label = deriveLabel(subject);
    const isSelected =
      shownThreadId === comment.data.threadId && arenaFrame === shownArenaFrame;
    const onClickAway = () => {
      setShownThreadId(undefined);
      setShownArenaFrame(undefined);
    };
    return (
      <CommentMarker
        tpl={subject}
        viewCtx={ensure(viewCtx, "")}
        className={"CommentMarker"}
        onClick={(e) => {
          if (!isSelected) {
            setShownThreadId(comment.data.threadId);
            setShownArenaFrame(arenaFrame);
          }
        }}
        isSelected={isSelected}
      >
        <div className={"CommentMarkerInitial"}>
          <Avatar user={author} />
        </div>
        <div className={"CommentMarkerHover"}>
          {renderComment(
            comment,
            label,
            threadComments.length > 1
              ? `${threadComments.length - 1} replies`
              : "Reply",
            undefined,
            true
          )}
        </div>
        {isSelected && (
          <OnClickAway onDone={onClickAway}>
            <div className={"CommentMarkerSelected"}>
              {renderThread(threadComments)}
            </div>
          </OnClickAway>
        )}
      </CommentMarker>
    );
  }

  function isCommentForFrame(comment: ApiComment) {
    const subject = bundler.objByAddr(comment.data.location.subject);
    const variants = comment.data.location.variants.map((v) =>
      bundler.objByAddr(v)
    );
    const ownerComponent = studioCtx
      .tplMgr()
      .findComponentContainingTpl(subject as TplNode);
    const isForFrame =
      viewCtx?.component === ownerComponent &&
      xSymmetricDifference(variants, getCurrentVariants()).length === 0;
    return isForFrame;
  }

  const commentsForFrame = xGroupBy(
    allComments.filter((comment) => isCommentForFrame(comment)),
    (comment) => comment.data.threadId
  );

  return (
    <>
      {[...commentsForFrame.values()].map((threadComments) =>
        renderCommentMarker(threadComments)
      )}
    </>
  );
});

export const CommentMarker = observer(function CommentMarker({
  tpl,
  children,
  viewCtx,
  onClick,
  className,
  isSelected,
}: {
  tpl: TplNode;
  children?: ReactNode;
  viewCtx: ViewCtx;
  onClick?: (e: any) => void;
  className?: string;
  isSelected?: boolean;
}) {
  const isTargetingSomeNonBaseVariant =
    isTplVariantable(tpl) &&
    viewCtx.variantTplMgr().isTargetingNonBaseVariant(tpl);

  const [valNode, doms] = viewCtx.maybeDomsForTpl(tpl);

  const $elt = $(doms ?? []);

  if (!$elt || $elt.length === 0) {
    return null;
  }

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
      <div className={className} onClick={onClick}>
        {children}
      </div>
    </CanvasTransformedBox>,
    ensure(document.querySelector(".canvas-editor__scaler"), "")
  );
});
