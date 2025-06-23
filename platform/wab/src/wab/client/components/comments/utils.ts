import { CommentsCtx } from "@/wab/client/studio-ctx/comments-ctx";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  getSetOfPinnedVariantsForViewCtx,
  ViewCtx,
} from "@/wab/client/studio-ctx/view-ctx";
import { ApiCommentThread } from "@/wab/shared/ApiSchema";
import { Bundler } from "@/wab/shared/bundler";
import { getOrSetMap, xSymmetricDifference } from "@/wab/shared/common";
import { allComponentVariants } from "@/wab/shared/core/components";
import { allGlobalVariants } from "@/wab/shared/core/sites";
import {
  isTplNamable,
  summarizeTplNamable,
  TplNamable,
  tryGetTplOwnerComponent,
} from "@/wab/shared/core/tpls";
import {
  ArenaFrame,
  Component,
  isKnownVariant,
  ObjInst,
  TplNode,
  Variant,
} from "@/wab/shared/model/classes";
import { toVariantComboKey } from "@/wab/shared/Variants";
import { groupBy, keyBy, partition } from "lodash";
import { toJS } from "mobx";

/**
 * Subject info for a comment thread
 *
 * variants will be Undefined if the variant associated with
 * the comment thread has been deleted
 */
export interface SubjectInfo {
  subject: TplNamable;
  variants: Variant[] | undefined;
  ownerComponent: Component;
}

/**
 * Comment thread with subject info
 *
 * subjectInfo will be undefined if the
 * subject of the comment thread was deleted
 */
export interface TplCommentThread extends ApiCommentThread {
  label: string;
  subjectInfo?: SubjectInfo;
}

export type TplCommentThreads = TplCommentThread[];
export type CommentFilter = "all" | "mentions-and-replies" | "resolved";

export const FilterValueToLabel: Record<CommentFilter, string> = {
  all: "Opened",
  "mentions-and-replies": "Mentions and replies",
  resolved: "Resolved",
};

export function hasNonDeletedComments(thread: ApiCommentThread): boolean {
  // hide thread if it has no non-deleted comments
  return thread.comments.some((comment) => !comment.deletedAt);
}

export function getCommentThreadWithModelMetadata(
  studioCtx: StudioCtx,
  bundler: Bundler,
  thread: ApiCommentThread
): TplCommentThread {
  const subject = bundler.objByAddr(thread.location.subject);
  const isSubjectNamable = isTplNamable(subject);
  const ownerComponent = isSubjectNamable
    ? tryGetTplOwnerComponent(subject)
    : undefined;
  const commentThread = toJS(thread); // to ensure MobX observers detect all changes in thread

  if (!ownerComponent || !isSubjectNamable) {
    return {
      ...commentThread,
      subjectInfo: undefined,
      label: "Deleted element",
    };
  }
  const allComponentVariantsMap = keyBy(
    allComponentVariants(ownerComponent),
    (v) => v.uuid
  );
  const allGlobalVariantsMap = keyBy(
    allGlobalVariants(studioCtx.site, { includeDeps: "direct" }),
    (v) => v.uuid
  );
  const variants = thread.location.variants.reduce(function (
    filtered: Variant[],
    variantAddr
  ) {
    const variantInst = bundler.objByAddr(variantAddr);
    if (
      isKnownVariant(variantInst) &&
      (allComponentVariantsMap[variantInst.uuid] ||
        allGlobalVariantsMap[variantInst.uuid])
    ) {
      filtered.push(variantInst);
    }
    return filtered;
  },
  []);
  const hasDeletedVariants =
    thread.location.variants.length !== variants.length;

  return {
    ...commentThread,
    subjectInfo: {
      subject,
      ownerComponent,
      variants: hasDeletedVariants ? undefined : variants,
    },
    label: hasDeletedVariants
      ? "Deleted variant"
      : summarizeTplNamable(subject),
  };
}

export function getCommentThreadsWithModelMetadata(
  studioCtx: StudioCtx,
  bundler: Bundler,
  threads: ApiCommentThread[]
): TplCommentThreads {
  return threads
    .filter((thread) => hasNonDeletedComments(thread))
    .map((thread) =>
      getCommentThreadWithModelMetadata(studioCtx, bundler, thread)
    );
}

export function partitionThreadsForFrames(
  threads: TplCommentThreads,
  arenaFrames: ArenaFrame[],
  studioCtx: StudioCtx
) {
  const [current, other] = partition([...threads], (thread) =>
    arenaFrames.find((arenaFrame) => {
      const vc = studioCtx.tryGetViewCtxForFrame(arenaFrame);
      return vc && isCommentForFrame(vc, thread);
    })
  );

  return {
    current,
    other,
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

export function getSubjectVariantsKey(subject: TplNode, variants: Variant[]) {
  return `${subject.uuid},${toVariantComboKey(variants)}`;
}

export function computeCommentStats(threads: TplCommentThreads): {
  commentStatsBySubject: CommentStatsMap;
  commentStatsByComponent: CommentStatsMap;
  commentStatsByVariant: CommentStatsMap;
} {
  // filtered out threads with undefined(deleted) subject or variants
  const filteredThreads = threads.filter(
    (
      thread
    ): thread is TplCommentThread & {
      subjectInfo: SubjectInfo & { variants: Variant[] };
    } => !!thread.subjectInfo && !!thread.subjectInfo.variants
  );
  const threadsGroupedBySubject = groupBy(
    filteredThreads,
    (commentThread) => commentThread.subjectInfo.subject.uuid
  );

  const commentStatsBySubject: CommentStatsMap = new Map();
  const commentStatsByComponent: CommentStatsMap = new Map();
  const commentStatsByVariant: CommentStatsMap = new Map();

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
        const ownerComponent =
          commentThread.subjectInfo.subject &&
          tryGetTplOwnerComponent(commentThread.subjectInfo.subject);
        if (ownerComponent) {
          const ownerUuid = ownerComponent.uuid;
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

  const threadsGroupedByVariants = groupBy(filteredThreads, (commentThread) =>
    getSubjectVariantsKey(
      commentThread.subjectInfo.subject,
      commentThread.subjectInfo.variants
    )
  );

  Object.entries(threadsGroupedByVariants).forEach(
    ([subjectVariantsKey, commentThreads]) => {
      if (commentThreads.length > 0) {
        // Compute stats for the variant
        const variant = getOrSetMap<string, CommentsStats>(
          commentStatsByVariant,
          subjectVariantsKey,
          {
            commentCount: 0,
            replyCount: 0,
          }
        );
        variant.commentCount = commentThreads.length;
        variant.replyCount = commentThreads.reduce(
          (sum, thread) => sum + (thread.comments.length - 1), // comments count excluding the root comment
          0
        );
      }
    }
  );

  return {
    commentStatsBySubject,
    commentStatsByComponent,
    commentStatsByVariant,
  };
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

export function isCommentForFrame(
  viewCtx: ViewCtx,
  commentThread: TplCommentThread
) {
  const bundler = viewCtx.bundler();
  if (!commentThread.subjectInfo) {
    return false;
  }
  const { variants, ownerComponent } = commentThread.subjectInfo;

  const isForFrame =
    viewCtx.component === ownerComponent &&
    variants &&
    xSymmetricDifference(
      variants,
      getSetOfPinnedVariantsForViewCtx(viewCtx, bundler)
    ).length === 0;
  return isForFrame;
}

export function makeCommonFields(userId: string): {
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById: string;
  deletedAt: null;
  deletedById: null;
} {
  const now = new Date().toISOString();
  return {
    createdAt: now,
    updatedAt: now,
    createdById: userId,
    updatedById: userId,
    deletedAt: null,
    deletedById: null,
  };
}
