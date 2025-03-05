import {
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
import { autorun, computed, observable } from "mobx";

export class CommentsCtx {
  private disposals: (() => void)[] = [];

  private readonly _openThreadId = observable.box<CommentThreadId | undefined>(
    undefined
  );
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

  openThreadId() {
    return this._openThreadId.get();
  }

  openThreadTpl() {
    return this._openedNewThreadTpl.get();
  }

  bundler() {
    return this.studioCtx.bundler();
  }

  selfNotificationSettings() {
    return this._selfNotificationSettings.get();
  }

  branchId() {
    return this.studioCtx.dbCtx().branchInfo?.id;
  }

  projectId() {
    return this.studioCtx.siteInfo.id;
  }

  openViewCtx() {
    return this._openedViewCtx.get();
  }

  openCommentThreadDialog(viewCtx: ViewCtx, threadId: CommentThreadId) {
    this._openThreadId.set(threadId);
    this._openedViewCtx.set(viewCtx);
    this._openedNewThreadTpl.set(undefined);
  }

  openNewCommentDialog(viewCtx: ViewCtx, tpl: TplNamable) {
    this._openThreadId.set(undefined);
    this._openedViewCtx.set(viewCtx);
    this._openedNewThreadTpl.set(tpl);
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
    this._openThreadId.set(undefined);
    this._openedViewCtx.set(undefined);
    this._openedNewThreadTpl.set(undefined);
  }

  dispose() {
    this.disposals.forEach((d) => d());
  }
}
