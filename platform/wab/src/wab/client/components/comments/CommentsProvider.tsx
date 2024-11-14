import { apiKey } from "@/wab/client/api";
import {
  TplComment,
  getCommentsWithModelMetadata,
  getThreadsFromComments,
} from "@/wab/client/components/comments/utils";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  ApiCommentReaction,
  ApiNotificationSettings,
  ApiUser,
  BranchId,
  CommentId,
  CommentThreadId,
  GetCommentsResponse,
  ProjectId,
} from "@/wab/shared/ApiSchema";
import { FastBundler } from "@/wab/shared/bundler";
import { mkIdMap } from "@/wab/shared/collections";
import { ensure, sortBy, xGroupBy } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { ArenaFrame } from "@/wab/shared/model/classes";
import * as React from "react";
import { ReactNode, createContext, useMemo } from "react";
import { observer } from "mobx-react";
import { computed } from "mobx";
import useSWR, { KeyedMutator } from "swr";

export interface CommentsContextData {
  shownThreadId: CommentThreadId | undefined;
  setShownThreadId: (threadId: CommentThreadId | undefined) => void;
  shownArenaFrame: ArenaFrame | undefined;
  setShownArenaFrame: (threadId: ArenaFrame | undefined) => void;
  projectId: ProjectId;
  branchId?: BranchId;
  allComments: TplComment[];
  bundler: FastBundler;
  reactionsByCommentId: Map<CommentId, ApiCommentReaction[]>;
  refreshComments: KeyedMutator<GetCommentsResponse>;
  selfNotificationSettings?: ApiNotificationSettings;
  usersMap: Map<string, ApiUser>;
  threads: Map<CommentThreadId, TplComment[]>;
}

export interface CommentsData {
  allComments: TplComment[];
  usersMap: Map<string, ApiUser>;
  reactionsByCommentId: Map<CommentId, ApiCommentReaction[]>;
  threads: Map<CommentThreadId, TplComment[]>;
  bundler: FastBundler;
  refreshComments: KeyedMutator<GetCommentsResponse>;
  projectId: ProjectId;
  branchId?: BranchId;
}

export const CommentsContext = createContext<CommentsContextData | undefined>(
  undefined
);

export function useCommentsCtx() {
  return ensure(
    React.useContext(CommentsContext),
    "CommentContext provider not found"
  );
}

function useCommentsData(): CommentsData {
  const studioCtx = useStudioCtx();
  const appConfig = studioCtx.appCtx.appConfig;

  const defaultCommentsData = {
    allComments: [],
    usersMap: new Map<string, ApiUser>(),
    reactionsByCommentId: new Map<CommentId, ApiCommentReaction[]>(),
    threads: new Map<CommentThreadId, TplComment[]>(),
  };

  const bundler = studioCtx.bundler();

  const appCtx = useAppCtx();
  const api = appCtx.api;

  const projectId = studioCtx.siteInfo.id;
  const branchId = studioCtx.dbCtx().branchInfo?.id;

  // return default data if comments are not enabled
  if (!(DEVFLAGS.demo || appConfig.comments)) {
    return {
      bundler,
      refreshComments: async () => undefined,
      projectId,
      branchId,
      ...defaultCommentsData,
    };
  }

  const { data: maybeResponse, mutate: refreshComments } =
    useSWR<GetCommentsResponse>(
      apiKey(`getComments`, projectId, branchId),
      async () => {
        const response = await api.getComments(projectId, branchId);
        return response;
      },
      {
        revalidateOnMount: true,
        revalidateOnFocus: false,
        dedupingInterval: 0,
        focusThrottleInterval: 0,
      }
    );

  const parsedCommentsResponse = useMemo(() => {
    return computed(
      () => {
        if (!maybeResponse) {
          return defaultCommentsData;
        }

        const { comments, reactions, users, selfNotificationSettings } =
          maybeResponse;

        const allComments = getCommentsWithModelMetadata(bundler, comments);
        const usersMap = mkIdMap(users);
        const reactionsByCommentId = xGroupBy(
          sortBy(reactions, (r) => +new Date(r.createdAt)),
          (reaction) => reaction.commentId
        );
        const threads = getThreadsFromComments(allComments);

        return {
          allComments,
          usersMap,
          reactionsByCommentId,
          selfNotificationSettings,
          threads,
        };
      },
      { name: "commentsData" }
    );
  }, [JSON.stringify(maybeResponse ?? null)]).get();

  return {
    bundler,
    refreshComments,
    projectId,
    branchId,
    ...parsedCommentsResponse,
  };
}

export const CommentsProvider = observer(function CommentsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [shownThreadId, setShownThreadId] = React.useState<
    CommentThreadId | undefined
  >(undefined);
  const [shownArenaFrame, setShownArenaFrame] = React.useState<
    ArenaFrame | undefined
  >(undefined);

  const studioCtx = useStudioCtx();
  const commentsData = useCommentsData();

  React.useEffect(() => {
    if (commentsData) {
      studioCtx.commentsData = commentsData;
    }
  }, [commentsData]);

  return (
    <CommentsContext.Provider
      value={{
        shownThreadId,
        setShownThreadId,
        shownArenaFrame,
        setShownArenaFrame,
        ...commentsData,
      }}
    >
      {children}
    </CommentsContext.Provider>
  );
});
