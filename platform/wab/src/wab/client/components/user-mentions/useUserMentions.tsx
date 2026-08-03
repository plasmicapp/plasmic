import {
  matchScore,
  useMentions,
} from "@/wab/client/components/mentions/useMentions";
import { UserMentionsPopoverContent } from "@/wab/client/components/user-mentions/UserMentionsPopoverContent";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { getUniqueUsersFromApiPermissions } from "@/wab/shared/perms";
import * as React from "react";

/**
 * User `@`-mentions for the comments composer. A thin wrapper over the generic
 * {@link useMentions} machinery.
 */
export function useUserMentions({
  popoverOffset = 0,
  value,
  inputSelector,
}: {
  popoverOffset?: number;
  value: string;
  inputSelector: string;
}) {
  const studioCtx = useStudioCtx();
  const users = React.useMemo(
    () => getUniqueUsersFromApiPermissions(studioCtx.siteInfo.perms),
    [studioCtx.siteInfo.perms]
  );

  const { mentionsPopover, onKeyHandler, onSelectHandler, handleMentionClick } =
    useMentions({
      popoverOffset,
      value,
      inputSelector,
      items: users,
      score: (user, query) =>
        matchScore(
          [user.firstName, user.lastName, user.email].filter(
            (word) => word !== null
          ),
          query
        ),
      getInsertText: (user) => user.email,
      renderContent: ({ items, highlightIndex, onSelect }) => (
        <UserMentionsPopoverContent
          users={items}
          highlightIndex={highlightIndex}
          onSelectUser={onSelect}
        />
      ),
    });

  return {
    userMentionsPopover: mentionsPopover,
    onKeyHandler,
    onSelectHandler,
    handleMentionClick,
  };
}
