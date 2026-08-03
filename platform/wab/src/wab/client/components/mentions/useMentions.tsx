import DropdownOverlay from "@/wab/client/components/widgets/DropdownOverlay";
import { useElementWidth } from "@/wab/client/hooks/useElementWidth";
import { useQuerySelector } from "@/wab/client/hooks/useQuerySelector";
import * as React from "react";
import { useCallback, useState } from "react";
import { useInteractOutside, useOverlayPosition } from "react-aria";

const MAX_MENTION_RESULTS = 50;

/**
 * Generic `@`-mention machinery for a plain text input
 */
export function useMentions<T>({
  popoverOffset = 0,
  value,
  inputSelector,
  items,
  score,
  getInsertText,
  renderContent,
  matchInputWidth = false,
  onOpen,
}: {
  popoverOffset?: number;
  value: string;
  inputSelector: string;
  items: T[];
  matchInputWidth?: boolean;
  onOpen?: () => void;
  /**
   * Scores how well `item` matches `query` (higher ranks first); return
   * `undefined` to exclude it. Use {@link matchScore} for a default.
   */
  score: (item: T, query: string) => number | undefined;
  /** The mention content to insert inside `@<text>`*/
  getInsertText: (item: T) => string;
  renderContent: (args: {
    items: T[];
    highlightIndex: number;
    onSelect: (item: T) => void;
  }) => React.ReactNode;
}) {
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [mentionText, setMentionText] = useState<string | undefined>(undefined);
  const mentionActive = mentionText !== undefined;

  React.useEffect(() => {
    setHighlightIndex(0);
  }, [mentionText]);

  React.useEffect(() => {
    if (mentionActive) {
      onOpen?.();
    }
  }, [mentionActive, onOpen]);

  const filteredItems =
    mentionText === undefined
      ? items.slice(0, MAX_MENTION_RESULTS)
      : items
          .map((item) => ({
            item,
            score: score(item, mentionText),
          }))
          .filter((x): x is { item: T; score: number } => x.score !== undefined)
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_MENTION_RESULTS)
          .map((x) => x.item);

  const inputElement =
    useQuerySelector<HTMLInputElement>(inputSelector) ?? null;
  const overlayRef = React.useRef<HTMLDivElement>(null);

  const inputWidth = useElementWidth(inputElement, {
    enabled: matchInputWidth,
  });

  const { overlayProps: overlayPositionProps } = useOverlayPosition({
    targetRef: { current: inputElement },
    overlayRef,
    placement: "bottom left",
    offset: popoverOffset,
    crossOffset: 0,
    isOpen: mentionActive,
    shouldFlip: false,
    maxHeight: 240,
  });

  // When we click an item in the popover, it makes the input lose focus, so we
  // detect clicks inside the popover and keep the input focused; otherwise we
  // close the popover.
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

        setMentionText(undefined);
      }
    },
    [inputElement]
  );

  const handleSelect = useCallback(
    (item: T) => {
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
      insertText(`<${getInsertText(item)}> `, {
        start: mentionStart + 1,
        end: caret,
      });
    },
    [inputElement, value, insertText, getInsertText]
  );

  const onKeyHandler = useCallback(
    (e: React.KeyboardEvent) => {
      if (mentionActive && filteredItems.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlightIndex((prev) => (prev + 1) % filteredItems.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlightIndex(
            (prev) => (prev - 1 + filteredItems.length) % filteredItems.length
          );
        } else if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          handleSelect(filteredItems[highlightIndex % filteredItems.length]);
        }
      }
    },
    [filteredItems, handleSelect, highlightIndex, mentionActive]
  );

  const onSelectHandler = useCallback(() => {
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

  const mentionsPopover =
    mentionActive && filteredItems.length > 0 ? (
      <DropdownOverlay
        ref={overlayRef}
        {...overlayPositionProps}
        style={{
          position: "absolute",
          display: "block",
          ...overlayPositionProps.style,
          width: inputWidth,
          ...(matchInputWidth ? { minWidth: 200, maxWidth: 400 } : {}),
        }}
      >
        {renderContent({
          items: filteredItems,
          highlightIndex,
          onSelect: handleSelect,
        })}
      </DropdownOverlay>
    ) : null;

  return {
    mentionsPopover,
    onKeyHandler,
    onSelectHandler,
    handleMentionClick,
  };
}

/**
 * Index of the `@` that opens the mention the caret is inside, or -1 if the
 * caret isn't in a mention.
 */
function getMentionStartIndex(value: string, caretIndex: number): number {
  for (let i = caretIndex - 1; i >= 0; i--) {
    const ch = value[i];
    if (ch === ">" || ch === "\n") {
      return -1;
    }
    if (ch === "@") {
      // The `@` must start the input or follow whitespace, so an email like
      // `a@b` isn't treated as a mention.
      return i === 0 || /\s/.test(value[i - 1]) ? i : -1;
    }
  }
  return -1;
}

function findMentionText(
  value: string,
  caretIndex: number
): string | undefined {
  const start = getMentionStartIndex(value, caretIndex);
  if (start < 0) {
    return undefined;
  }
  // Everything after the opening `@` (and optional `<`) is the query — spaces
  // included, so typing a space keeps the popover open.
  return value.slice(start, caretIndex).replace(/^@<?/, "");
}

/** Score how well `searchableStrings` match `query` (higher is better, undefined is no match) */
export function matchScore(
  searchableStrings: string[],
  query: string
): number | undefined {
  if (query === "") {
    return 0;
  }
  const q = query.toLowerCase();
  let best: number | undefined;
  searchableStrings.forEach((str, i) => {
    const s = str.toLowerCase();
    // Prefix-match ranks above substring-match;
    const matchRank = s.startsWith(q) ? 2 : s.includes(q) ? 1 : 0;
    if (matchRank === 0) {
      return;
    }
    // Tiebreak by field position: earlier fields (smaller i) score higher.
    const score = matchRank + 1 / (i + 1);
    if (best === undefined || score > best) {
      best = score;
    }
  });
  return best;
}

export const _testOnlyMentionUtils = {
  getMentionStartIndex,
  findMentionText,
};
