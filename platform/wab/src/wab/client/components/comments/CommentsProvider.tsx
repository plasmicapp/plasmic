import { apiKey } from "@/wab/client/api";
import {
  TplCommentThread,
  getCommentThreadsWithModelMetadata,
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
import { computed } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { ReactNode, createContext, useMemo } from "react";
import useSWR, { KeyedMutator } from "swr";

export interface CommentsContextData {
  shownThreadId: CommentThreadId | undefined;
  setShownThreadId: (threadId: CommentThreadId | undefined) => void;
  shownArenaFrame: ArenaFrame | undefined;
  setShownArenaFrame: (threadId: ArenaFrame | undefined) => void;
  projectId: ProjectId;
  branchId?: BranchId;
  allThreads: TplCommentThread[];
  bundler: FastBundler;
  reactionsByCommentId: Map<CommentId, ApiCommentReaction[]>;
  refreshComments: KeyedMutator<GetCommentsResponse>;
  selfNotificationSettings?: ApiNotificationSettings;
  usersMap: Map<string, ApiUser>;
}

export interface CommentsData {
  allThreads: TplCommentThread[];
  usersMap: Map<string, ApiUser>;
  reactionsByCommentId: Map<CommentId, ApiCommentReaction[]>;
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
    allThreads: [],
    usersMap: new Map<string, ApiUser>(),
    reactionsByCommentId: new Map<CommentId, ApiCommentReaction[]>(),
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

        const { threads, reactions, users, selfNotificationSettings } =
          maybeResponse;

        const allThreads = getCommentThreadsWithModelMetadata(bundler, threads);
        const usersMap = mkIdMap(users);
        const reactionsByCommentId = xGroupBy(
          sortBy(reactions, (r) => +new Date(r.createdAt)),
          (reaction) => reaction.commentId
        );

        return {
          allThreads,
          usersMap,
          reactionsByCommentId,
          selfNotificationSettings,
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
