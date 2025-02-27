import { UserMentionsPopoverContent } from "@/wab/client/components/user-mentions/UserMentionsPopoverContent";
import DropdownOverlay from "@/wab/client/components/widgets/DropdownOverlay";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { getUniqueUsersFromApiPermissions } from "@/wab/shared/perms";
import * as React from "react";
import { useCallback, useState } from "react";
import { useOverlayPosition } from "react-aria";

export function useUserMentions({
  popoverTargetRef,
  popoverOffset = 0,
  value,
  onValueChange,
}: {
  popoverTargetRef: React.RefObject<HTMLElement>;
  popoverOffset?: number;
  value: string;
  onValueChange: (newValue: string) => void;
}) {
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionText, setMentionText] = useState("");

  const studioCtx = useStudioCtx();
  const users = getUniqueUsersFromApiPermissions(studioCtx.siteInfo.perms);

  const filteredUsers = users.filter(
    (user) =>
      !mentionText ||
      `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(mentionText.toLowerCase()) ||
      user.email.toLowerCase().includes(mentionText.toLowerCase())
  );

  const overlayRef = React.useRef<HTMLDivElement>(null);
  const { overlayProps: overlayPositionProps } = useOverlayPosition({
    targetRef: popoverTargetRef,
    overlayRef,
    placement: "bottom",
    shouldFlip: false,
    offset: popoverOffset,
    crossOffset: 0,
    isOpen: mentionActive,
  });

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
            const words = value.split(/\s+/);
            words[words.length - 1] = `@${selectedUser.email} `;

            onValueChange(words.join(" "));
            setMentionActive(false);
            setMentionText("");
          }
        }
      }
    },
    [filteredUsers, onValueChange, value, mentionActive]
  );

  const onChangeHandler = (newVal: string) => {
    onValueChange(newVal);

    const words = newVal.split(" ");
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith("@")) {
      setMentionActive(true);
      setMentionText(lastWord.slice(1));
    } else {
      setMentionActive(false);
      setMentionText("");
    }
  };

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

  return { userMentionsPopover, onKeyHandler, onChangeHandler };
}
