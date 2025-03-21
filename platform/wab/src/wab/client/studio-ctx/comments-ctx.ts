import {
  CommentFilter,
  computeCommentStats,
  getCommentThreadsWithModelMetadata,
} from "@/wab/client/components/comments/utils";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  ApiCommentReaction,
  ApiCommentThread,
  ApiNotificationSettings,
  ApiUser,
  CommentThreadId,
  GetCommentsResponse,
} from "@/wab/shared/ApiSchema";
import { mkIdMap } from "@/wab/shared/collections";
import {
  extractMentionedEmails,
  hasUserParticipatedInThread,
} from "@/wab/shared/comments-utils";
import { assert, sortBy, xGroupBy } from "@/wab/shared/common";
import { TplNamable } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { partition } from "lodash";
import { autorun, observable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";

export const COMMENTS_DIALOG_RIGHT_ZOOM_PADDING = 320;
export class CommentsCtx {
  private disposals: (() => void)[] = [];

  private readonly _openedThreadId = observable.box<
    CommentThreadId | undefined
  >(undefined);
  private readonly _openedNewThreadTpl = observable.box<TplNamable | undefined>(
    undefined
  );
  private readonly _openedViewCtx = observable.box<ViewCtx>(undefined);
  private readonly _rawThreads = observable.box<ApiCommentThread[]>([]);
  private readonly _rawUsers = observable.box<ApiUser[]>([]);
  private readonly _rawReactions = observable.box<ApiCommentReaction[]>([]);
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
        {
          name: "CommentsCtx.fetchComments",
        }
      )
    );
  }

  private readonly _computedData = computedFn(() => {
    const allThreads = getCommentThreadsWithModelMetadata(
      this.bundler(),
      this._rawThreads.get()
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
      usersMap: mkIdMap(this._rawUsers.get()),
      reactionsByCommentId: xGroupBy(
        sortBy(this._rawReactions.get(), (r) => +new Date(r.createdAt)),
        (r) => r.commentId
      ),
    };
  });

  computedData() {
    return this._computedData();
  }

  openedThreadId() {
    return this._openedThreadId.get();
  }

  openedThreadTpl() {
    return this._openedNewThreadTpl.get();
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

  openedViewCtx() {
    return this._openedViewCtx.get();
  }

  openCommentThreadDialog(
    threadId: CommentThreadId,
    viewCtx?: ViewCtx | undefined // If undefined, the element or its corresponding view context must be in focus for correct behavior.
  ) {
    runInAction(() => {
      // Use the provided viewCtx, or fall back to the currently focused view context if not provided.
      // This ensures the comment thread opens in the correct context, as the element should already be focused.
      this._openedViewCtx.set(viewCtx || this.studioCtx.focusedViewCtx());
      this._openedThreadId.set(threadId);
      this._openedNewThreadTpl.set(undefined);
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
      this._openedThreadId.set(undefined);
      this._openedViewCtx.set(viewCtx);
      this._openedNewThreadTpl.set(tpl);
    });
  }

  async fetchComments() {
    const projectId = this.studioCtx.siteInfo.id;
    const branchId = this.studioCtx.dbCtx().branchInfo?.id;
    if (!(DEVFLAGS.demo || this.studioCtx.appCtx.appConfig.comments)) {
      return;
    }

    const response: GetCommentsResponse | null =
      await this.studioCtx.appCtx.api.getComments(projectId, branchId);
    if (!response) {
      return;
    }

    this._rawThreads.set(response.threads);
    this._rawUsers.set(response.users);
    this._rawReactions.set(response.reactions);
    this._selfNotificationSettings.set(response.selfNotificationSettings);
  }

  closeCommentDialogs() {
    runInAction(() => {
      this._openedThreadId.set(undefined);
      this._openedViewCtx.set(undefined);
      this._openedNewThreadTpl.set(undefined);
    });
  }

  dispose() {
    this.disposals.forEach((d) => d());
  }
}
