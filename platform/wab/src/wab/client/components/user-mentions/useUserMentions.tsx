import { UserMentionsPopoverContent } from "@/wab/client/components/user-mentions/UserMentionsPopoverContent";
import DropdownOverlay from "@/wab/client/components/widgets/DropdownOverlay";
import { useQuerySelector } from "@/wab/client/hooks/useQuerySelector";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ApiUser } from "@/wab/shared/ApiSchema";
import { getUniqueUsersFromApiPermissions } from "@/wab/shared/perms";
import * as React from "react";
import { useCallback, useState } from "react";
import { useInteractOutside, useOverlayPosition } from "react-aria";
import { regex } from "regex";

export function useUserMentions({
  popoverOffset = 0,
  value,
  onValueChange,
  inputSelector,
}: {
  popoverOffset?: number;
  value: string;
  onValueChange: (newValue: string) => void;
  inputSelector: string;
}) {
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [mentionText, setMentionText] = useState<string | undefined>(undefined);
  const mentionActive = mentionText !== undefined;

  const studioCtx = useStudioCtx();
  const users = getUniqueUsersFromApiPermissions(studioCtx.siteInfo.perms);

  const filteredUsers = users.filter(
    (user) =>
      mentionText === undefined ||
      `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(mentionText.toLowerCase()) ||
      user.email.toLowerCase().includes(mentionText.toLowerCase())
  );

  const inputElement =
    useQuerySelector<HTMLInputElement>(inputSelector) ?? null;
  const overlayRef = React.useRef<HTMLDivElement>(null);

  const { overlayProps: overlayPositionProps } = useOverlayPosition({
    targetRef: { current: inputElement },
    overlayRef,
    placement: "bottom",
    offset: popoverOffset,
    crossOffset: 0,
    isOpen: mentionActive,
  });

  // When we click on user in popover, it makes input lose focus,
  // so we detect click inside popover and keep the input focus, otherwise we close the popover.
  useInteractOutside({
    ref: { current: inputElement },
    onInteractOutside: (event) => {
      if (
        overlayRef.current &&
        overlayRef.current.contains(event.target as Node)
      ) {
        inputElement?.focus();
        return;
      }

      setMentionText(undefined);
    },
  });

  const insertText = useCallback(
    (text: string) => {
      if (inputElement) {
        inputElement.focus();
        document.execCommand("insertText", false, text);

        const newCaretIndex = (inputElement.selectionStart || 0) + text.length;
        inputElement.setSelectionRange(newCaretIndex, newCaretIndex);
        setMentionText(undefined);
      }
    },
    [inputElement]
  );

  const handleSelectUser = (selectedUser: ApiUser) => {
    insertText(`<${selectedUser.email}> `);
  };

  const onKeyHandler = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (mentionActive) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlightIndex((prev) => (prev + 1) % filteredUsers.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlightIndex(
            (prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length
          );
        } else if (e.key === "Enter") {
          e.preventDefault();
          const selectedUser = filteredUsers[highlightIndex];
          handleSelectUser(selectedUser);
        }
      }
    },
    [filteredUsers, handleSelectUser, highlightIndex, mentionActive]
  );

  const onInputSelectHandler = useCallback(() => {
    if (!inputElement) {
      setMentionText(undefined);
      return;
    }

    const caretIndex = inputElement.selectionStart || 0;
    const foundMentionText = findMentionText(value, caretIndex);
    setMentionText(foundMentionText);
  }, [inputElement, value]);

  const handleMentionClick = useCallback(() => {
    if (!inputElement) {
      return;
    }

    const caretIndex = inputElement.selectionStart || 0;
    const prevCharacter = value[caretIndex - 1];

    insertText(caretIndex === 0 || /\s/.test(prevCharacter) ? "@" : " @");
    setMentionText((prev) => `${prev ?? ""}@`);
  }, [inputElement, value, insertText]);

  const userMentionsPopover = mentionActive ? (
    <DropdownOverlay
      ref={overlayRef}
      {...overlayPositionProps}
      style={{
        position: "absolute",
        display: "block",
        ...overlayPositionProps.style,
      }}
    >
      <UserMentionsPopoverContent
        users={filteredUsers}
        highlightIndex={highlightIndex}
        onSelectUser={handleSelectUser}
      />
    </DropdownOverlay>
  ) : null;

  return {
    userMentionsPopover,
    onKeyHandler,
    onSelectHandler: onInputSelectHandler,
    handleMentionClick,
  };
}

function getTokenStartIndex(value: string, caretIndex: number) {
  // Scan backwards from the caret until a whitespace is found.
  let tokenStart = caretIndex - 1;
  while (tokenStart >= 0 && !/\s/.test(value[tokenStart])) {
    tokenStart--;
  }
  // tokenStart is now positioned at the whitespace (or -1); the token starts at tokenStart+1.
  tokenStart++;

  return tokenStart;
}

function findMentionText(value: string, caretIndex: number) {
  if (caretIndex === 0) {
    return undefined;
  }

  const tokenStart = getTokenStartIndex(value, caretIndex);
  const token = value.slice(tokenStart, caretIndex);

  const mentionTextRegex = regex("g")`
    ^
    (@<|@)
    (?<mentionText>[^\s>]*)
    $
  `;
  const match = mentionTextRegex.exec(token);
  if (!match?.groups) {
    return undefined;
  }

  return match.groups.mentionText;
}

function typeTextAtCaretPosition(
  value: string,
  text: string,
  startIndex: number,
  endIndex?: number
) {
  if (!endIndex) {
    endIndex = startIndex;
  }

  const beforeCaret = value.slice(0, startIndex);
  const afterCaret = value.slice(endIndex);

  const newValue = beforeCaret + text + afterCaret;
  const newCaretPosition = startIndex + text.length;

  return { newValue, newCaretPosition };
}

export const _testOnlyUserMentionsUtils = {
  getTokenStartIndex,
  findMentionText,
  typeTextAtCaretPosition,
};
