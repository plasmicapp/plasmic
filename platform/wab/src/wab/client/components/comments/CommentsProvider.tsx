import { apiKey } from "@/wab/client/api";
import {
  TplComments,
  getCommentsWithModelMetadata,
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
import { ArenaFrame } from "@/wab/shared/model/classes";
import * as React from "react";
import { ReactNode, createContext, useMemo } from "react";
import useSWR, { KeyedMutator } from "swr";

interface CommentsContextData {
  shownThreadId: CommentThreadId | undefined;
  setShownThreadId: (threadId: CommentThreadId | undefined) => void;
  shownArenaFrame: ArenaFrame | undefined;
  setShownArenaFrame: (threadId: ArenaFrame | undefined) => void;
  projectId: ProjectId;
  branchId?: BranchId;
  allComments: TplComments;
  bundler: FastBundler;
  reactionsByCommentId: Map<CommentId, ApiCommentReaction[]>;
  refreshComments: KeyedMutator<GetCommentsResponse>;
  selfNotificationSettings?: ApiNotificationSettings;
  usersMap: Map<string, ApiUser>;
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

function useCommentsData() {
  const studioCtx = useStudioCtx();
  const bundler = studioCtx.bundler();

  const appCtx = useAppCtx();
  const api = appCtx.api;

  const projectId = studioCtx.siteInfo.id;
  const branchId = studioCtx.dbCtx().branchInfo?.id;

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
    if (!maybeResponse) {
      return {
        allComments: [],
        usersMap: new Map<string, ApiUser>(),
        reactionsByCommentId: new Map<CommentId, ApiCommentReaction[]>(),
      };
    }

    const { comments, reactions, users, selfNotificationSettings } =
      maybeResponse;

    const allComments = getCommentsWithModelMetadata(bundler, comments);
    const usersMap = mkIdMap(users);
    const reactionsByCommentId = xGroupBy(
      sortBy(reactions, (r) => +new Date(r.createdAt)),
      (reaction) => reaction.commentId
    );

    return {
      allComments,
      usersMap,
      reactionsByCommentId,
      selfNotificationSettings,
    };
  }, [JSON.stringify(maybeResponse ?? null)]);

  return {
    bundler,
    refreshComments,
    projectId,
    branchId,
    ...parsedCommentsResponse,
  };
}

export function CommentsProvider({ children }: { children: ReactNode }) {
  const [shownThreadId, setShownThreadId] = React.useState<
    CommentThreadId | undefined
  >(undefined);
  const [shownArenaFrame, setShownArenaFrame] = React.useState<
    ArenaFrame | undefined
  >(undefined);

  const commentsData = useCommentsData();

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
}
