import { ArenaFrame } from "@/wab/classes";
import { apiKey } from "@/wab/client/api";
import { CommentOverlaysContext } from "@/wab/client/components/comments/CommentOverlays";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { mkIdMap } from "@/wab/collections";
import { ensure, tuple } from "@/wab/common";
import {
  ApiUser,
  CommentThreadId,
  GetCommentsResponse,
} from "@/wab/shared/ApiSchema";
import { uniq } from "lodash";
import * as React from "react";
import { ReactNode, useEffect } from "react";
import useSWR from "swr";

export function CommentsProvider({ children }: { children: ReactNode }) {
  const appCtx = useAppCtx();
  const studioCtx = useStudioCtx();
  const api = appCtx.api;
  const projectId = studioCtx.siteInfo.id;
  const branchId = studioCtx.dbCtx().branchInfo?.id;

  const { data: maybeResponse, isValidating } = useSWR<
    [GetCommentsResponse, Map<string, ApiUser>]
  >(
    apiKey(`getComments`, projectId, branchId),
    async () => {
      const response = await api.getComments(projectId, branchId);
      const { comments, reactions } = response;
      const { users } =
        comments.length > 0
          ? await api.getUsersById(
              uniq([
                ...comments.map((comment) => ensure(comment.createdById, "")),
                ...reactions.map((reaction) =>
                  ensure(reaction.createdById, "")
                ),
              ])
            )
          : { users: [] };
      const userMap = mkIdMap(users);
      return tuple(response, userMap);
    },
    {
      revalidateOnMount: true,
      revalidateOnFocus: false,
      dedupingInterval: 0,
      focusThrottleInterval: 0,
    }
  );

  const [shownThreadId, setShownThreadId] = React.useState<
    CommentThreadId | undefined
  >(undefined);
  const [shownArenaFrame, setShownArenaFrame] = React.useState<
    ArenaFrame | undefined
  >(undefined);

  useEffect(() => {
    if (maybeResponse) {
      studioCtx.commentsData = maybeResponse;
    }
  }, [JSON.stringify(maybeResponse ?? null)]);

  return (
    <CommentOverlaysContext.Provider
      value={{
        shownThreadId,
        setShownThreadId,
        shownArenaFrame,
        setShownArenaFrame,
      }}
    >
      {children}
    </CommentOverlaysContext.Provider>
  );
}
