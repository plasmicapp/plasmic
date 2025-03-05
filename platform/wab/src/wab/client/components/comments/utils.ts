import { CommentsCtx } from "@/wab/client/studio-ctx/comments-ctx";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ApiCommentThread } from "@/wab/shared/ApiSchema";
import { Bundler, FastBundler } from "@/wab/shared/bundler";
import { getOrSetMap, xSymmetricDifference } from "@/wab/shared/common";
import {
  TplNamable,
  getTplOwnerComponent,
  isTplNamable,
  summarizeTplNamable,
  tryGetTplOwnerComponent,
} from "@/wab/shared/core/tpls";
import { Component, ObjInst, TplNode } from "@/wab/shared/model/classes";
import assert from "assert";
import { groupBy, partition, sortBy } from "lodash";

type LocalizedCommentThread = ApiCommentThread & {
  location: NonNullable<ApiCommentThread["location"]>;
};

export interface TplCommentThread extends LocalizedCommentThread {
  subject: TplNamable;
  label: string;
  ownerComponent: Component;
}

export type TplCommentThreads = TplCommentThread[];

export function isValidCommentThread(
  bundler: Bundler,
  thread: ApiCommentThread
): thread is LocalizedCommentThread {
  if (!thread.location) {
    return false;
  }

  const subject = bundler.objByAddr(thread.location.subject);
  // The subject has been deleted since the comment was created
  if (!subject) {
    return false;
  }

  const variants = thread.location.variants.map((addr) =>
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

export function getCommentThreadWithModelMetadata(
  bundler: Bundler,
  thread: LocalizedCommentThread
): TplCommentThread {
  const inst = bundler.objByAddr(thread.location.subject);
  assert(isTplNamable(inst), "Comment thread subject must be a TplNamable");

  const subject = inst;
  const ownerComponent = getTplOwnerComponent(subject);
  return {
    ...thread,
    subject,
    label: summarizeTplNamable(subject),
    ownerComponent,
  };
}

export function getCommentThreadsWithModelMetadata(
  bundler: Bundler,
  threads: ApiCommentThread[]
): TplCommentThreads {
  return threads
    .filter((thread): thread is LocalizedCommentThread =>
      isValidCommentThread(bundler, thread)
    )
    .map((thread) => getCommentThreadWithModelMetadata(bundler, thread));
}

function sortThreadsByLastComment(threads: TplCommentThreads) {
  return sortBy(
    [...threads],
    (thread) => -new Date(thread.comments[thread.comments.length - 1].createdAt)
  );
}

export function getThreadsFromFocusedComponent(
  threads: TplCommentThreads,
  focusedComponent: Component,
  focusedTpl: TplNode | null | undefined
) {
  const [_focusedComponentThreads, otherComponentsThreads] = partition(
    [...threads],
    (thread) => thread.ownerComponent === focusedComponent
  );
  const [focusedSubjectThreads, focusedComponentThreads] = partition(
    _focusedComponentThreads,
    (thread) => thread.subject === focusedTpl
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

export type CommentStatsMap = Map<string, CommentsStats>;

export function getUnresolvedThreads(
  threads: TplCommentThreads
): TplCommentThreads {
  return threads.filter((thread) => !thread.resolved);
}

export function computeCommentStats(threads: TplCommentThreads): {
  commentStatsBySubject: CommentStatsMap;
  commentStatsByComponent: CommentStatsMap;
} {
  const threadsGroupedBySubject = groupBy(
    threads,
    (commentThread) => commentThread.subject.uuid
  );

  const commentStatsBySubject: CommentStatsMap = new Map();
  const commentStatsByComponent: CommentStatsMap = new Map();

  Object.entries(threadsGroupedBySubject).forEach(
    ([subjectUuid, commentThreads]) => {
      if (commentThreads.length > 0) {
        // Compute stats for the subject
        const subjectStats = getOrSetMap<string, CommentsStats>(
          commentStatsBySubject,
          subjectUuid,
          {
            commentCount: 0,
            replyCount: 0,
          }
        );
        subjectStats.commentCount = commentThreads.length;
        subjectStats.replyCount = commentThreads.reduce(
          (sum, thread) => sum + (thread.comments.length - 1), // comments count excluding the root comment
          0
        );

        const [commentThread] = commentThreads;
        const ownerComponent = tryGetTplOwnerComponent(commentThread.subject);
        if (ownerComponent) {
          const ownerUuid = ownerComponent.tplTree.uuid;
          const componentStats = getOrSetMap<string, CommentsStats>(
            commentStatsByComponent,
            ownerUuid,
            {
              commentCount: 0,
              replyCount: 0,
            }
          );

          componentStats.commentCount += subjectStats.commentCount;
          componentStats.replyCount += subjectStats.replyCount;
        }
      }
    }
  );

  return { commentStatsBySubject, commentStatsByComponent };
}

export function isElementWithComments(
  commentsCtx: CommentsCtx,
  element: ObjInst
) {
  if (!isTplNamable(element)) {
    return false;
  }
  return commentsCtx
    .computedData()
    .unresolvedThreads.some(
      (commentThread) =>
        commentsCtx.bundler().objByAddr(commentThread.location.subject) ===
        element
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
  commentThread: TplCommentThread
) {
  const bundler = studioCtx.bundler();
  const subject = bundler.objByAddr(commentThread.location.subject);
  const variants = commentThread.location.variants.map((v) =>
    bundler.objByAddr(v)
  );
  const ownerComponent = studioCtx
    .tplMgr()
    .findComponentContainingTpl(subject as TplNode);
  const isForFrame =
    viewCtx.component === ownerComponent &&
    xSymmetricDifference(variants, getSetOfVariantsForViewCtx(viewCtx, bundler))
      .length === 0;
  return isForFrame;
}
