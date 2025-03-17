import {
  CommentFilter,
  computeCommentStats,
  getCommentThreadsWithModelMetadata,
  getUnresolvedThreads,
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
import { sortBy, xGroupBy } from "@/wab/shared/common";
import { TplNamable } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { autorun, computed, observable, runInAction } from "mobx";

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

  private readonly _computedData = computed(() => {
    const allThreads = getCommentThreadsWithModelMetadata(
      this.bundler(),
      this._rawThreads.get()
    );
    const unresolvedThreads = getUnresolvedThreads(allThreads);
    const commentStats = computeCommentStats(unresolvedThreads);
    return {
      allThreads,
      unresolvedThreads,
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
    return this._computedData.get();
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
