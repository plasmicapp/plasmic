import {
  findMentionText,
  getMentionStartIndex,
  matchScore,
} from "@/wab/client/components/mentions/mention-query";
import { useMentions } from "@/wab/client/components/mentions/useMentions";
import { UserMentionsPopoverContent } from "@/wab/client/components/user-mentions/UserMentionsPopoverContent";
import { useQuerySelector } from "@/wab/client/hooks/useQuerySelector";
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

  const { mentionsPopover, onKeyHandler, setMentionText } = useMentions({
    popoverOffset,
    items: users,
    getMatchScore: (user, query) =>
      matchScore(
        [user.firstName, user.lastName, user.email].filter(
          (word) => word !== null
        ),
        query
      ),
    renderPopoverContent: ({ suggestions, highlightIndex, onSelect }) => (
      <UserMentionsPopoverContent
        users={suggestions}
        highlightIndex={highlightIndex}
        onSelectUser={onSelect}
      />
    ),
    anchorElement: inputElement,
    onPick,
    onRefocus: () => inputElement?.focus(),
  });

  const onSelectHandler = React.useCallback(() => {
    if (!inputElement) {
      setMentionText(undefined);
      return;
    }

    const caretIndex = inputElement.selectionStart || 0;
    setMentionText(findMentionText(value, caretIndex));
  }, [inputElement, value, setMentionText]);

  const handleMentionClick = React.useCallback(() => {
    if (!inputElement) {
      return;
    }

    const caretIndex = inputElement.selectionStart || 0;
    const prevCharacter = value[caretIndex - 1];

    insertText(caretIndex === 0 || /\s/.test(prevCharacter) ? "@" : " @");
    setMentionText("");
  }, [inputElement, value, insertText, setMentionText]);

  return {
    userMentionsPopover: mentionsPopover,
    onKeyHandler,
    onSelectHandler,
    handleMentionClick,
  };
}
