import { UserMentionsPopoverContent } from "@/wab/client/components/user-mentions/UserMentionsPopoverContent";
import DropdownOverlay from "@/wab/client/components/widgets/DropdownOverlay";
import { useQuerySelector } from "@/wab/client/hooks/useQuerySelector";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { getUniqueUsersFromApiPermissions } from "@/wab/shared/perms";
import * as React from "react";
import { useCallback, useState } from "react";
import { useOverlayPosition } from "react-aria";

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
  const [mentionText, setMentionText] = useState("");
  const mentionActive = mentionText !== "";

  const studioCtx = useStudioCtx();
  const users = getUniqueUsersFromApiPermissions(studioCtx.siteInfo.perms);

  const filterText = mentionText.slice(1); // first character is @
  const filteredUsers = users.filter(
    (user) =>
      !filterText ||
      `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(filterText.toLowerCase()) ||
      user.email.toLowerCase().includes(filterText.toLowerCase())
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

  const setInputCaretPosition = useCallback(
    (caretIndex: number) => {
      // Use setTimeout to ensure this happens after the state update
      setTimeout(() => {
        if (inputElement) {
          inputElement.focus();
          inputElement.setSelectionRange(caretIndex, caretIndex);
        }
      }, 0);
    },
    [inputElement]
  );

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
          if (selectedUser) {
            if (!inputElement) {
              return;
            }

            const caretIndex = inputElement.selectionStart || 0;
            const { newValue, newCaretPosition } = completeMention(
              value,
              caretIndex,
              selectedUser.email
            );

            onValueChange(newValue);
            setMentionText("");
            setInputCaretPosition(newCaretPosition);
          }
        }
      }
    },
    [
      filteredUsers,
      onValueChange,
      value,
      mentionActive,
      inputElement,
      setInputCaretPosition,
    ]
  );

  const onSelectHandler = useCallback(() => {
    if (!inputElement) {
      setMentionText("");
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
    const { newValue, newCaretPosition } = typeTextAtCaretPosition(
      value,
      "@",
      caretIndex
    );

    onValueChange(newValue);
    setMentionText((prev) => `${prev}@`);
    setInputCaretPosition(newCaretPosition);
  }, [inputElement, value, setInputCaretPosition]);

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
      />
    </DropdownOverlay>
  ) : null;

  return {
    userMentionsPopover,
    onKeyHandler,
    onSelectHandler,
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
    return "";
  }

  const tokenStart = getTokenStartIndex(value, caretIndex);
  const token = value.slice(tokenStart, caretIndex);

  return token.startsWith("@") ? token : "";
}

function completeMention(
  value: string,
  caretIndex: number,
  selectedUserEmail: string
) {
  const tokenStart = getTokenStartIndex(value, caretIndex);
  return typeTextAtCaretPosition(
    value,
    `@${selectedUserEmail} `,
    tokenStart,
    caretIndex
  );
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
  completeMention,
  findMentionText,
  typeTextAtCaretPosition,
};
