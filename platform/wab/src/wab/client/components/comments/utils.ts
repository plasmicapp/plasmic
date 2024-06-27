import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { xGroupBy, xMapValues } from "@/wab/shared/common";
import {
  ApiComment,
  CommentData,
  CommentThreadId,
} from "@/wab/shared/ApiSchema";
import { Bundler } from "@/wab/shared/bundler";
import { Component, ObjInst, TplNode } from "@/wab/shared/model/classes";
import {
  TplNamable,
  getTplOwnerComponent,
  isTplNamable,
  summarizeTplNamable,
  tryGetTplOwnerComponent,
} from "@/wab/shared/core/tpls";
import assert from "assert";
import { partition, sortBy } from "lodash";

export interface TplComment extends ApiComment, CommentData {
  subject: TplNamable;
  label: string;
  ownerComponent: Component;
}

export type TplComments = TplComment[];

export function isValidComment(bundler: Bundler, comment: ApiComment) {
  const subject = bundler.objByAddr(comment.data.location.subject);
  // The bundle doesn't have the object
  if (!subject) {
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
  comment: ApiComment
): TplComment {
  const inst = bundler.objByAddr(comment.data.location.subject);
  assert(isTplNamable(inst), "Comment subject must be a TplNamable");

  const subject = inst;
  const ownerComponent = getTplOwnerComponent(subject);
  return {
    ...comment,
    ...comment.data,
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
    .filter((comment) => isValidComment(bundler, comment))
    .map((comment) => getCommentWithModelMetadata(bundler, comment));
}

export function getThreadsFromComments(comments: TplComment[]) {
  const threads = xMapValues(
    xGroupBy(comments, (comment) => comment.threadId),
    (threadComments) => sortBy(threadComments, (comment) => comment.createdAt)
  );
  return threads;
}

function sortThreadsByLastComment(threads: TplComments[]) {
  return sortBy(
    [...threads.values()],
    (thread) => -thread[thread.length - 1].createdAt
  );
}

export function getThreadsFromFocusedComponent(
  threads: Map<CommentThreadId, TplComments>,
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

export function isElementWithComments(studioCtx: StudioCtx, element: ObjInst) {
  if (!isTplNamable(element)) {
    return false;
  }
  const bundler = studioCtx.bundler();
  return studioCtx.commentsData?.[0].comments.some(
    (comment) => bundler.objByAddr(comment.data.location.subject) === element
  );
}
