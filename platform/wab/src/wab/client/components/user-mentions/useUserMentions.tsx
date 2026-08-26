import {
  findMentionText,
  getMentionStartIndex,
  matchScore,
} from "@/wab/client/components/mentions/mention-query";
import { useMentionsPopover } from "@/wab/client/components/mentions/useMentionsPopover";
import { UserMentionsPopoverContent } from "@/wab/client/components/user-mentions/UserMentionsPopoverContent";
import { useQuerySelector } from "@/wab/client/hooks/useQuerySelector";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { getUniqueUsersFromApiPermissions } from "@/wab/shared/perms";
import * as React from "react";

/**
 * User `@`-mentions for the comments composer. A thin wrapper over the generic
 * {@link useMentionsPopover} machinery.
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

  const inputElement =
    useQuerySelector<HTMLInputElement>(inputSelector) ?? null;

  const insertText = React.useCallback(
    (text: string, opts?: { start?: number; end?: number }) => {
      if (inputElement) {
        inputElement.focus();

        if (opts?.start !== undefined || opts?.end !== undefined) {
          inputElement.setSelectionRange(
            opts?.start ?? null,
            opts?.end ?? null
          );
        }

        document.execCommand("insertText", false, text);
      }
    },
    [inputElement]
  );

  const onPick = React.useCallback(
    (user: (typeof users)[number]) => {
      if (!inputElement) {
        return;
      }

      const caret = inputElement.selectionStart || 0;
      const mentionStart = getMentionStartIndex(value, caret);
      if (mentionStart < 0) {
        return;
      }
      /* mentionStart points to the @ character; we replace everything after @ up
       * to the caret with the inserted text. */
      insertText(`<${user.email}> `, {
        start: mentionStart + 1,
        end: caret,
      });
    },
    [inputElement, value, insertText]
  );

  const [mentionQuery, setMentionQuery] = React.useState<string | undefined>(
    undefined
  );

  const { mentionsPopover, onKeyHandler } = useMentionsPopover({
    query: mentionQuery,
    onClose: () => setMentionQuery(undefined),
    offset: popoverOffset,
    items: users,
    getMatchScore: (user, query) =>
      matchScore(
        [user.firstName, user.lastName, user.email].filter(
          (word) => word !== null
        ),
        query
      ),
    renderPopoverContent: ({ suggestions, highlightIndex, onSelect }) =>
      suggestions.length === 0 ? null : (
        <UserMentionsPopoverContent
          users={suggestions}
          highlightIndex={highlightIndex}
          onSelectUser={onSelect}
        />
      ),
    anchorElement: inputElement,
    onPick,
  });

  const onSelectHandler = React.useCallback(() => {
    if (!inputElement) {
      setMentionQuery(undefined);
      return;
    }

    const caretIndex = inputElement.selectionStart || 0;
    setMentionQuery(findMentionText(value, caretIndex));
  }, [inputElement, value]);

  const handleMentionClick = React.useCallback(() => {
    if (!inputElement) {
      return;
    }

    const caretIndex = inputElement.selectionStart || 0;
    const prevCharacter = value[caretIndex - 1];

    insertText(caretIndex === 0 || /\s/.test(prevCharacter) ? "@" : " @");
    setMentionQuery("");
  }, [inputElement, value, insertText]);

  return {
    userMentionsPopover: mentionsPopover,
    onKeyHandler,
    onSelectHandler,
    handleMentionClick,
  };
}
