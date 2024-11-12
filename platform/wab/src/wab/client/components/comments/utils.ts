import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  CommentsContextData,
  CommentsData,
} from "@/wab/client/components/comments/CommentsProvider";
import { ApiComment } from "@/wab/shared/ApiSchema";
import { Bundler, FastBundler } from "@/wab/shared/bundler";
import {
  xGroupBy,
  xMapValues,
  xSymmetricDifference,
} from "@/wab/shared/common";
import {
  TplNamable,
  getTplOwnerComponent,
  isTplNamable,
  summarizeTplNamable,
  tryGetTplOwnerComponent,
} from "@/wab/shared/core/tpls";
import { Component, ObjInst, TplNode } from "@/wab/shared/model/classes";
import assert from "assert";
import { partition, sortBy } from "lodash";

type LocalizedComment = ApiComment & {
  location: NonNullable<ApiComment["location"]>;
};

export interface TplComment extends LocalizedComment {
  subject: TplNamable;
  label: string;
  ownerComponent: Component;
}

export type TplComments = TplComment[];

export function isValidComment(
  bundler: Bundler,
  comment: ApiComment
): comment is LocalizedComment {
  if (!comment.location) {
    return false;
  }

  const subject = bundler.objByAddr(comment.location.subject);
  // The subject has been deleted since the comment was created
  if (!subject) {
    return false;
  }

  const variants = comment.location.variants.map((addr) =>
    bundler.objByAddr(addr)
  );

  const hasInvalidVariant = variants.some((variant) => !variant);
  // It's possible that the variant was deleted, so we will filter out those
  // comments too
  if (hasInvalidVariant) {
    return false;
  }

  // The object is not a TplNamable
  if (!isTplNamable(subject)) {
    return false;
  }

  // The object can be removed from the bundle during the session
  // so we check if it has an owner component
  const ownerComponent = tryGetTplOwnerComponent(subject);
  return !!ownerComponent;
}

export function getCommentWithModelMetadata(
  bundler: Bundler,
  comment: LocalizedComment
): TplComment {
  const inst = bundler.objByAddr(comment.location.subject);
  assert(isTplNamable(inst), "Comment subject must be a TplNamable");

  const subject = inst;
  const ownerComponent = getTplOwnerComponent(subject);
  return {
    ...comment,
    subject,
    label: summarizeTplNamable(subject),
    ownerComponent,
  };
}

export function getCommentsWithModelMetadata(
  bundler: Bundler,
  comments: ApiComment[]
): TplComments {
  return comments
    .filter((comment): comment is LocalizedComment =>
      isValidComment(bundler, comment)
    )
    .map((comment) => getCommentWithModelMetadata(bundler, comment));
}

export function getThreadsFromComments(comments: TplComment[]) {
  const threads = xMapValues(
    xGroupBy(comments, (comment) => comment.threadId),
    (threadComments) =>
      sortBy(threadComments, (comment) => +new Date(comment.createdAt))
  );
  return threads;
}

function sortThreadsByLastComment(threads: TplComments[]) {
  return sortBy(
    [...threads.values()],
    (thread) => -new Date(thread[thread.length - 1].createdAt)
  );
}

export function getThreadsFromFocusedComponent(
  threads: Map<string, TplComments>,
  focusedComponent: Component,
  focusedTpl: TplNode | null | undefined
) {
  const [_focusedComponentThreads, otherComponentsThreads] = partition(
    [...threads.values()],
    (thread) => thread[0].ownerComponent === focusedComponent
  );
  const [focusedSubjectThreads, focusedComponentThreads] = partition(
    _focusedComponentThreads,
    (thread) => thread[0].subject === focusedTpl
  );

  return {
    focusedSubjectThreads: sortThreadsByLastComment(focusedSubjectThreads),
    focusedComponentThreads: sortThreadsByLastComment(focusedComponentThreads),
    otherComponentsThreads: sortThreadsByLastComment(otherComponentsThreads),
  };
}

/** Number of threads and replies for an element */
export interface CommentsStats {
  /** Total number of threads associated with an element */
  commentCount: number;
  /** Total number of replies across all threads for an element, excluding the initial comment in each thread */
  replyCount: number;
}

export function getElementCommentsStats(
  commentsCtx: CommentsContextData,
  element: ObjInst
) {
  const count: CommentsStats = {
    commentCount: 0,
    replyCount: 0,
  };
  if (!isTplNamable(element)) {
    return count;
  }
  const threads = commentsCtx.threads;
  const bundler = commentsCtx.bundler;
  for (const thread of threads.values()) {
    if (bundler.objByAddr(thread[0].location.subject) === element) {
      count.commentCount += 1;
      count.replyCount += thread.length - 1;
    }
  }
  return count;
}

export function isElementWithComments(
  commentsCtx: CommentsContextData | CommentsData,
  element: ObjInst
) {
  if (!isTplNamable(element)) {
    return false;
  }
  const bundler = commentsCtx.bundler;
  return commentsCtx.allComments.some(
    (comment) => bundler.objByAddr(comment.location.subject) === element
  );
}

export function getSetOfVariantsForViewCtx(
  viewCtx: ViewCtx,
  bundler: FastBundler
) {
  return sortBy(
    [
      ...viewCtx.currentComponentStackFrame().getPinnedVariants().keys(),
      ...viewCtx.globalFrame.getPinnedVariants().keys(),
      ...viewCtx.currentComponentStackFrame().getTargetVariants(),
      ...viewCtx.globalFrame.getTargetVariants(),
    ],
    (v) => bundler.addrOf(v).iid
  );
}

export function isCommentForFrame(
  studioCtx: StudioCtx,
  viewCtx: ViewCtx,
  comment: TplComment
) {
  const bundler = studioCtx.bundler();
  const subject = bundler.objByAddr(comment.location.subject);
  const variants = comment.location.variants.map((v) => bundler.objByAddr(v));
  const ownerComponent = studioCtx
    .tplMgr()
    .findComponentContainingTpl(subject as TplNode);
  const isForFrame =
    viewCtx.component === ownerComponent &&
    xSymmetricDifference(variants, getSetOfVariantsForViewCtx(viewCtx, bundler))
      .length === 0;
  return isForFrame;
}
