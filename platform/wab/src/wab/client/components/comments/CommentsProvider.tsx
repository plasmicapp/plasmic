import { uniq } from "lodash";
import * as React from "react";
import { ReactNode, useEffect } from "react";
import useSWR from "swr";
import { ArenaFrame } from "../../../classes";
import { mkIdMap } from "../../../collections";
import { ensure, tuple } from "../../../common";
import {
  ApiUser,
  CommentThreadId,
  GetCommentsResponse,
} from "../../../shared/ApiSchema";
import { apiKey } from "../../api";
import { useAppCtx } from "../../contexts/AppContexts";
import { useStudioCtx } from "../../studio-ctx/StudioCtx";
import { CommentOverlaysContext } from "./CommentOverlays";

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

  const [shownThreadId, setShownThreadId] =
    React.useState<CommentThreadId | undefined>(undefined);
  const [shownArenaFrame, setShownArenaFrame] =
    React.useState<ArenaFrame | undefined>(undefined);

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
