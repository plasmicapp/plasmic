import {
  CommentFilter,
  computeCommentStats,
  getCommentThreadsWithModelMetadata,
  isCommentForFrame,
  makeCommonFields,
} from "@/wab/client/components/comments/utils";
import { reportError, showError } from "@/wab/client/ErrorNotifications";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  ApiComment,
  ApiCommentReaction,
  ApiCommentThread,
  ApiCommentThreadHistory,
  ApiNotificationSettings,
  ApiUser,
  CommentId,
  CommentReactionData,
  CommentReactionId,
  CommentThreadId,
  GetCommentsResponse,
  RootCommentData,
  ThreadCommentData,
  ThreadHistoryId,
} from "@/wab/shared/ApiSchema";
import { mkIdMap } from "@/wab/shared/collections";
import {
  extractMentionedEmails,
  hasUserParticipatedInThread,
} from "@/wab/shared/comments-utils";
import {
  assert,
  ensure,
  mkUuid,
  sortBy,
  spawn,
  xGroupBy,
} from "@/wab/shared/common";
import { TplNamable } from "@/wab/shared/core/tpls";
import { partition } from "lodash";
import { autorun, observable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";

export const COMMENTS_DIALOG_RIGHT_ZOOM_PADDING = 320;

export interface OpenedThread {
  threadId: CommentThreadId;
  viewCtx: ViewCtx;
}

export interface OpenedNewThread {
  tpl: TplNamable;
  viewCtx: ViewCtx;
}

export class CommentsCtx {
  private disposals: (() => void)[] = [];

  private readonly _openedThread = observable.box<OpenedThread | undefined>(
    undefined
  );
  private readonly _openedNewThread = observable.box<
    OpenedNewThread | undefined
  >(undefined);
  private readonly _rawThreads = observable.array<ApiCommentThread>([], {
    deep: true,
  });
  private readonly _rawUsers = observable.array<ApiUser>([], { deep: true });
  private readonly _rawReactions = observable.array<ApiCommentReaction>([], {
    deep: true,
  });
  private readonly _selfNotificationSettings = observable.box<
    ApiNotificationSettings | undefined
  >(undefined);
  private _commentsFilter = observable.box<CommentFilter>("all");

  constructor(private readonly studioCtx: StudioCtx) {
    this.disposals.push(
      autorun(
        async () => {
          await this.fetchComments();
        },
        { name: "CommentsCtx.fetchComments" }
      )
    );
  }

  private readonly _computedData = computedFn(() => {
    const allThreads = getCommentThreadsWithModelMetadata(
      this.bundler(),
      this._rawThreads
    );
    const [resolvedThreads, unresolvedThreads] = partition(
      allThreads,
      (thread) => thread.resolved
    );
    const commentStats = computeCommentStats(unresolvedThreads);
    return {
      allThreads,
      unresolvedThreads,
      resolvedThreads,
      commentStatsBySubject: commentStats.commentStatsBySubject,
      commentStatsByComponent: commentStats.commentStatsByComponent,
      commentStatsByVariant: commentStats.commentStatsByVariant,
      usersMap: mkIdMap(this._rawUsers),
      reactionsByCommentId: xGroupBy(
        sortBy(this._rawReactions, (r) => +new Date(r.createdAt)),
        (r) => r.commentId
      ),
    };
  });

  computedData() {
    return this._computedData();
  }

  readonly getThreadsGroupedBySubjectForViewCtx = computedFn(
    (viewCtx: ViewCtx) => {
      return xGroupBy(
        this.computedData().unresolvedThreads.filter((commentThread) =>
          isCommentForFrame(viewCtx, commentThread)
        ),
        (commentThread) => commentThread.subject.uuid
      );
    }
  );

  openedThread() {
    return this._openedThread.get();
  }

  openedNewThread() {
    return this._openedNewThread.get();
  }

  bundler() {
    return this.studioCtx.bundler();
  }

  selfNotificationSettings() {
    return this._selfNotificationSettings.get();
  }

  commentsFilter() {
    return this._commentsFilter.get();
  }

  setCommentsFilter(filter: CommentFilter) {
    this._commentsFilter.set(filter);
  }

  branchId() {
    return this.studioCtx.dbCtx().branchInfo?.id;
  }

  projectId() {
    return this.studioCtx.siteInfo.id;
  }

  openCommentThreadDialog(threadId: CommentThreadId, viewCtx: ViewCtx) {
    runInAction(() => {
      this._openedNewThread.set(undefined);
      this._openedThread.set({ viewCtx, threadId });
    });
  }

  filteredThreads() {
    const selfInfo = this.studioCtx.appCtx.selfInfo;
    const filter = this.commentsFilter();
    const { resolvedThreads, unresolvedThreads, allThreads } =
      this.computedData();

    assert(selfInfo, "Expected selfInfo to exists in AppCtx");

    if (filter === "mentions-and-replies") {
      return allThreads.filter((thread) =>
        thread.comments.some((comment) => {
          if (extractMentionedEmails(comment.body).includes(selfInfo.email)) {
            return true;
          }
          if (hasUserParticipatedInThread(selfInfo.id, thread.comments)) {
            return true;
          }
          return false;
        })
      );
    }

    if (filter === "resolved") {
      return resolvedThreads;
    }

    return unresolvedThreads;
  }

  openNewCommentDialog(viewCtx: ViewCtx, tpl: TplNamable) {
    runInAction(() => {
      this._openedThread.set(undefined);
      this._openedNewThread.set({ viewCtx, tpl });
    });
  }

  async fetchComments() {
    const projectId = this.studioCtx.siteInfo.id;
    const branchId = this.studioCtx.dbCtx().branchInfo?.id;
    if (!this.studioCtx.showComments()) {
      return;
    }

    try {
      const response: GetCommentsResponse =
        await this.studioCtx.appCtx.api.getComments(projectId, branchId);

      runInAction(() => {
        this._rawThreads.replace(response.threads);
        this._rawUsers.replace(response.users);
        this._rawReactions.replace(response.reactions);
        this._selfNotificationSettings.set(response.selfNotificationSettings);
      });
    } catch (err) {
      reportError(err);
      showError(err, {
        title: "Unable to process your request",
        description: "Failed to fetch comments for project",
      });
    }
  }

  closeCommentDialogs() {
    runInAction(() => {
      this._openedNewThread.set(undefined);
      this._openedThread.set(undefined);
    });
  }

  dispose() {
    this.disposals.forEach((d) => d());
  }

  private createThread(commentData: RootCommentData): ApiCommentThread {
    const user = ensure(this.studioCtx.appCtx.selfInfo, "must have selfInfo");
    const commonFields = makeCommonFields(user.id);
    const newComment: ApiComment = {
      id: commentData.commentId!,
      body: commentData.body,
      commentThreadId: commentData.commentThreadId!,
      ...commonFields,
    };
    const newThread: ApiCommentThread = {
      id: commentData.commentThreadId!,
      location: commentData.location,
      resolved: false,
      comments: [newComment],
      commentThreadHistories: [],
      ...commonFields,
    };
    runInAction(() => {
      this._rawThreads.unshift(newThread);
    });
    return newThread;
  }

  private addComment(
    threadId: CommentThreadId,
    commentData: ThreadCommentData
  ): ApiComment {
    const user = ensure(this.studioCtx.appCtx.selfInfo, "must have selfInfo");
    const commonFields = makeCommonFields(user.id);
    const newComment: ApiComment = {
      id: commentData.id,
      body: commentData.body,
      commentThreadId: threadId,
      ...commonFields,
    };
    runInAction(() => {
      const thread = this._rawThreads.find((t) => t.id === threadId);
      if (thread) {
        thread.comments.push(newComment);
      }
    });
    return newComment;
  }

  private editCommentBody(commentId: CommentId, body: string) {
    runInAction(() => {
      const thread = this._rawThreads.find((t) =>
        t.comments.some((c) => c.id === commentId)
      );
      if (thread) {
        const comment = thread.comments.find((c) => c.id === commentId);
        if (comment) {
          comment.body = body;
          comment.updatedAt = new Date().toISOString();
        }
      }
    });
  }

  private deleteThreadComment(commentId: CommentId) {
    runInAction(() => {
      const thread = this._rawThreads.find((t) =>
        t.comments.some((c) => c.id === commentId)
      );
      if (thread) {
        const comment = thread.comments.find((c) => c.id === commentId);
        if (comment) {
          comment.body = "";
          comment.deletedAt = new Date().toISOString();
          comment.deletedById = this.studioCtx.appCtx.selfInfo?.id!;
        }
      }
    });
  }

  private addReaction(
    id: CommentReactionId,
    commentId: CommentId,
    data: CommentReactionData
  ): ApiCommentReaction {
    const user = ensure(this.studioCtx.appCtx.selfInfo, "must have selfInfo");
    const commonFields = makeCommonFields(user.id);
    const newReaction: ApiCommentReaction = {
      id,
      commentId,
      data,
      ...commonFields,
    };
    runInAction(() => {
      this._rawReactions.push(newReaction);
    });
    return newReaction;
  }

  private removeReaction(reactionId: CommentReactionId) {
    runInAction(() => {
      const index = this._rawReactions.findIndex((r) => r.id === reactionId);
      if (index !== -1) {
        this._rawReactions.splice(index, 1);
      }
    });
  }

  private addThreadHistory(
    id: ThreadHistoryId,
    threadId: CommentThreadId,
    resolved: boolean
  ): ApiCommentThreadHistory {
    const user = ensure(this.studioCtx.appCtx.selfInfo, "must have selfInfo");
    const commonFields = makeCommonFields(user.id);
    const newHistory = {
      id,
      commentThreadId: threadId,
      resolved,
      ...commonFields,
    };
    runInAction(() => {
      const thread = this._rawThreads.find((t) => t.id === threadId);
      if (thread) {
        thread.commentThreadHistories.push(newHistory);
        thread.resolved = resolved;
      }
    });
    return newHistory;
  }

  private spawnHandlingErrors<T>(promise: Promise<T>): void {
    spawn(
      (async () => {
        try {
          await promise;
        } catch (err) {
          reportError(err);
          showError(err, {
            title: "Unable to process your request",
            description: "Please try again",
          });
          spawn(this.fetchComments());
        }
      })()
    );
  }

  postRootComment(
    commentData: Omit<RootCommentData, "commentThreadId" | "commentId">
  ): ApiCommentThread {
    const api = this.studioCtx.appCtx.api;
    const optimisticRootCommentData = {
      ...commentData,
      commentThreadId: mkUuid() as CommentThreadId,
      commentId: mkUuid() as CommentId,
    };
    this.spawnHandlingErrors(
      api.postRootComment(
        this.projectId(),
        this.branchId(),
        optimisticRootCommentData
      )
    );
    return this.createThread(optimisticRootCommentData);
  }

  postThreadComment(
    threadId: CommentThreadId,
    commentData: Omit<ThreadCommentData, "id">
  ) {
    const api = this.studioCtx.appCtx.api;
    const optimisticThreadCommentData = {
      ...commentData,
      id: mkUuid() as CommentId,
    };
    this.spawnHandlingErrors(
      api.postThreadComment(
        this.projectId(),
        this.branchId(),
        threadId,
        optimisticThreadCommentData
      )
    );
    return this.addComment(threadId, optimisticThreadCommentData);
  }

  editThread(threadId: CommentThreadId, resolved: boolean) {
    const api = this.studioCtx.appCtx.api;
    const id = mkUuid() as ThreadHistoryId;
    this.spawnHandlingErrors(
      api.editThread(this.projectId(), this.branchId(), threadId, {
        id,
        resolved,
      })
    );
    return this.addThreadHistory(id, threadId, resolved);
  }

  editComment(commentId: CommentId, body: string) {
    const api = this.studioCtx.appCtx.api;
    this.spawnHandlingErrors(
      api.editComment(this.projectId(), this.branchId(), commentId, {
        body,
      })
    );
    this.editCommentBody(commentId, body);
  }

  deleteComment(commentId: CommentId) {
    const api = this.studioCtx.appCtx.api;
    this.spawnHandlingErrors(
      api.deleteComment(this.projectId(), this.branchId(), commentId)
    );
    this.deleteThreadComment(commentId);
  }

  addReactionToComment(
    commentId: CommentId,
    data: Omit<CommentReactionData, "id">
  ): ApiCommentReaction {
    const api = this.studioCtx.appCtx.api;
    const id = mkUuid() as CommentReactionId;
    this.spawnHandlingErrors(
      api.addReactionToComment(
        id,
        this.projectId(),
        this.branchId(),
        commentId,
        data
      )
    );
    return this.addReaction(id, commentId, data);
  }

  removeReactionFromComment(reactionId: CommentReactionId) {
    const api = this.studioCtx.appCtx.api;
    this.spawnHandlingErrors(
      api.removeReactionFromComment(
        this.projectId(),
        this.branchId(),
        reactionId
      )
    );
    this.removeReaction(reactionId);
  }
}
