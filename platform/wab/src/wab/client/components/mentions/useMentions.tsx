import DropdownOverlay from "@/wab/client/components/widgets/DropdownOverlay";
import { useElementWidth } from "@/wab/client/hooks/useElementWidth";
import * as React from "react";
import { useCallback, useState } from "react";
import { useInteractOutside, useOverlayPosition } from "react-aria";

const MAX_MENTION_RESULTS = 50;

/**
 * Generic `@`-mention machinery for a plain text input
 */
export function useMentions<T>({
  popoverOffset = 0,
  items,
  getMatchScore,
  renderPopoverContent,
  matchInputWidth = false,
  onOpen,
  anchorElement,
  onPick,
  onRefocus,
}: {
  popoverOffset?: number;
  items: T[];
  matchInputWidth?: boolean;
  onOpen?: () => void;
  /**
   * Scores how well `item` matches `query` (higher ranks first); return
   * `undefined` to exclude it. Use {@link matchScore} for a default.
   */
  getMatchScore: (item: T, query: string) => number | undefined;
  renderPopoverContent: (args: {
    /** The mentionable items that matched, ranked best-first. */
    suggestions: T[];
    highlightIndex: number;
    onSelect: (item: T) => void;
  }) => React.ReactNode;
  anchorElement: HTMLElement | null;
  onPick: (item: T) => void;
  /** Returns focus to the editor after a click inside the popover. */
  onRefocus?: () => void;
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

  const suggestions =
    mentionText === undefined
      ? items.slice(0, MAX_MENTION_RESULTS)
      : items
          .map((item) => ({
            item,
            score: getMatchScore(item, mentionText),
          }))
          .filter((x): x is { item: T; score: number } => x.score !== undefined)
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_MENTION_RESULTS)
          .map((x) => x.item);

  const overlayRef = React.useRef<HTMLDivElement>(null);

  const inputWidth = useElementWidth(anchorElement, {
    enabled: matchInputWidth,
  });

  const { overlayProps: overlayPositionProps } = useOverlayPosition({
    targetRef: { current: anchorElement },
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
    ref: { current: anchorElement },
    onInteractOutside: (event) => {
      if (
        overlayRef.current &&
        overlayRef.current.contains(event.target as Node)
      ) {
        onRefocus?.();
        return;
      }

      setMentionText(undefined);
    },
  });

  const handleSelect = useCallback(
    (item: T) => {
      onPick(item);
      setMentionText(undefined);
    },
    [onPick]
  );

  const onKeyHandler = useCallback(
    (e: React.KeyboardEvent) => {
      if (mentionActive && suggestions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlightIndex((prev) => (prev + 1) % suggestions.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlightIndex(
            (prev) => (prev - 1 + suggestions.length) % suggestions.length
          );
        } else if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          handleSelect(suggestions[highlightIndex % suggestions.length]);
        } else if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          setMentionText(undefined);
        }
      }
    },
    [suggestions, handleSelect, highlightIndex, mentionActive]
  );

  const mentionsPopover =
    mentionActive && suggestions.length > 0 ? (
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
        {renderPopoverContent({
          suggestions,
          highlightIndex,
          onSelect: handleSelect,
        })}
      </DropdownOverlay>
    ) : null;

  return {
    mentionsPopover,
    onKeyHandler,
    mentionText,
    setMentionText,
  };
}
