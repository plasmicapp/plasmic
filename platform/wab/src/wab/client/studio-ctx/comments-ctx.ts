import {
  CommentFilter,
  CommentsStats,
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
import { AnyArena } from "@/wab/shared/Arenas";
import { mkIdMap } from "@/wab/shared/collections";
import {
  extractMentionedEmails,
  hasUserParticipatedInThread,
} from "@/wab/shared/comments-utils";
import {
  assert,
  ensure,
  mkShortUuid,
  mkUuid,
  sortBy,
  spawn,
  xGroupBy,
} from "@/wab/shared/common";
import { TplNamable } from "@/wab/shared/core/tpls";
import { SEARCH_PARAM_COMMENT } from "@/wab/shared/route/app-routes";
import { partition } from "lodash";
import { autorun, observable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";

export const COMMENTS_DIALOG_RIGHT_ZOOM_PADDING = 320;

export interface OpenedThread {
  threadId: CommentThreadId;
  viewCtx?: ViewCtx;
  interacted: boolean;
}

export interface OpenedNewThread {
  tpl: TplNamable;
  viewCtx: ViewCtx;
  interacted: boolean;
}

export class CommentsCtx {
  private disposals: (() => void)[] = [];

  private readonly _openedThread = observable.box<OpenedThread | undefined>(
    undefined
  );
  private readonly _openedNewThread = observable.box<
    OpenedNewThread | undefined
  >(undefined);
  private readonly _commentsResponse = observable.box<{
    threads: ApiCommentThread[];
    users: ApiUser[];
    reactions: ApiCommentReaction[];
  } | null>(null);
  private readonly _selfNotificationSettings = observable.box<
    ApiNotificationSettings | undefined
  >(undefined);
  private _commentsFilter = observable.box<CommentFilter>("all");
  private readonly _drafts = {
    arenas: new WeakMap<AnyArena, string>(),
    threads: new WeakMap<ApiCommentThread, string>(),
  };
  private _skipZoomOnFocus = false;

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

  private ensureCommentsResponse() {
    return ensure(this._commentsResponse.get(), "Comments data not loaded");
  }

  private readonly _computedData = computedFn(() => {
    const response = this._commentsResponse.get();
    if (!response) {
      return {
        allThreads: [],
        unresolvedThreads: [],
        resolvedThreads: [],
        commentStatsBySubject: new Map<string, CommentsStats>(),
        commentStatsByComponent: new Map<string, CommentsStats>(),
        commentStatsByVariant: new Map<string, CommentsStats>(),
        usersMap: new Map<string, ApiUser>(),
        reactionsByCommentId: new Map<string, ApiCommentReaction[]>(),
      };
    }

    const allThreads = getCommentThreadsWithModelMetadata(
      this.studioCtx,
      this.bundler(),
      response.threads
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
      usersMap: mkIdMap(response.users),
      reactionsByCommentId: xGroupBy(
        sortBy(response.reactions, (r) => +new Date(r.createdAt)),
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
        (commentThread) => commentThread.subjectInfo?.subject.uuid
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

  /**
   * Returns the current value and resets it.
   */
  getAndResetSkipZoomOnFocus(): boolean {
    const value = this._skipZoomOnFocus;
    this._skipZoomOnFocus = false;
    return value;
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

  private getQueryParams(): URLSearchParams {
    return new URLSearchParams(this.studioCtx.appCtx.history.location.search);
  }

  closeNewThreadDialog() {
    this._openedNewThread.set(undefined);
  }

  openNewCommentDialog(viewCtx: ViewCtx, tpl: TplNamable) {
    runInAction(() => {
      this._openedThread.set(undefined);
      this._openedNewThread.set({ viewCtx, tpl, interacted: false });
    });
  }

  /**
   * Opens the comment thread dialog for the given thread.
   * `viewCtx` will be undefined for deleted subject threads.
   */
  handleOpenCommentThreadDialog(threadId: CommentThreadId, viewCtx?: ViewCtx) {
    runInAction(() => {
      this._openedNewThread.set(undefined);
      this._openedThread.set({ viewCtx, threadId, interacted: false });
    });
  }

  handleCloseThreadDialog() {
    this._openedThread.set(undefined);
  }

  openCommentThreadDialog(threadId: string, skipZoom?: boolean) {
    if (skipZoom) {
      this._skipZoomOnFocus = skipZoom;
    }
    const history = this.studioCtx.appCtx.history;
    const queryParams = this.getQueryParams();
    if (queryParams.get(SEARCH_PARAM_COMMENT) === threadId) {
      return;
    }
    queryParams.set(SEARCH_PARAM_COMMENT, threadId);
    history.push({
      search: queryParams.toString(),
    });
  }

  closeCommentThreadDialog() {
    const history = this.studioCtx.appCtx.history;
    const queryParams = this.getQueryParams();
    queryParams.delete(SEARCH_PARAM_COMMENT);
    history.push({
      search: queryParams.toString(),
    });
  }

  // Close comment dialogs if either thread exists without interaction
  maybeCloseCommentDialogs = () => {
    const currentOpenedNewThread = this.openedNewThread();
    const currentOpenedThread = this.openedThread();
    if (currentOpenedNewThread && !currentOpenedNewThread.interacted) {
      this.closeNewThreadDialog();
    }
    if (currentOpenedThread && !currentOpenedThread.interacted) {
      this.handleCloseThreadDialog();
    }
  };

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
        this._commentsResponse.set({
          threads: response.threads,
          users: response.users,
          reactions: response.reactions,
        });
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

  async waitForInitialCommentsLoad() {
    if (this._commentsResponse.get() !== null) {
      return;
    }

    await new Promise<void>((resolve) => {
      const disposer = autorun(() => {
        if (this._commentsResponse.get() !== null) {
          disposer();
          resolve();
        }
      });
    });
  }

  dispose() {
    this.disposals.forEach((d) => d());
  }

  getArenaDraft(arena: AnyArena): string {
    return this._drafts.arenas.get(arena) || "";
  }

  setArenaDraft(arena: AnyArena, body: string) {
    this._drafts.arenas.set(arena, body);
  }

  clearArenaDraft(arena: AnyArena) {
    this._drafts.arenas.delete(arena);
  }

  getThreadDraft(thread: ApiCommentThread): string {
    return this._drafts.threads.get(thread) || "";
  }

  setThreadDraft(thread: ApiCommentThread, body: string) {
    this._drafts.threads.set(thread, body);
  }

  clearThreadDraft(thread: ApiCommentThread) {
    this._drafts.threads.delete(thread);
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
      const commentResponse = this.ensureCommentsResponse();
      this._commentsResponse.set({
        ...commentResponse,
        threads: [newThread, ...commentResponse.threads],
      });
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
      const commentResponse = this.ensureCommentsResponse();
      const threads = commentResponse.threads.map((thread) => {
        if (thread.id === threadId) {
          return {
            ...thread,
            comments: [...thread.comments, newComment],
          };
        }
        return thread;
      });
      this._commentsResponse.set({
        ...commentResponse,
        threads,
      });
    });
    return newComment;
  }

  private editCommentBody(commentId: CommentId, body: string) {
    runInAction(() => {
      const commentResponse = this.ensureCommentsResponse();
      const threads = commentResponse.threads.map((thread) => ({
        ...thread,
        comments: thread.comments.map((comment) =>
          comment.id === commentId
            ? { ...comment, body, updatedAt: new Date().toISOString() }
            : comment
        ),
      }));
      this._commentsResponse.set({
        ...commentResponse,
        threads,
      });
    });
  }

  private deleteThreadComment(commentId: CommentId) {
    runInAction(() => {
      const commentResponse = this.ensureCommentsResponse();
      const threads = commentResponse.threads.map((thread) => ({
        ...thread,
        comments: thread.comments.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                body: "",
                deletedAt: new Date().toISOString(),
                deletedById: this.studioCtx.appCtx.selfInfo?.id!,
              }
            : comment
        ),
      }));
      this._commentsResponse.set({
        ...commentResponse,
        threads,
      });
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
      const commentResponse = this.ensureCommentsResponse();
      this._commentsResponse.set({
        ...commentResponse,
        reactions: [...commentResponse.reactions, newReaction],
      });
    });
    return newReaction;
  }

  private removeReaction(reactionId: CommentReactionId) {
    runInAction(() => {
      const commentResponse = this.ensureCommentsResponse();
      this._commentsResponse.set({
        ...commentResponse,
        reactions: commentResponse.reactions.filter((r) => r.id !== reactionId),
      });
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
      const commentResponse = this.ensureCommentsResponse();
      const threads = commentResponse.threads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              commentThreadHistories: [
                ...thread.commentThreadHistories,
                newHistory,
              ],
              resolved,
            }
          : thread
      );
      this._commentsResponse.set({
        ...commentResponse,
        threads,
      });
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
      commentThreadId: mkShortUuid<CommentThreadId>(),
      commentId: mkShortUuid<CommentId>(),
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
      id: mkShortUuid<CommentId>(),
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
    const id = mkUuid<ThreadHistoryId>();
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
    const id = mkUuid<CommentReactionId>();
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
