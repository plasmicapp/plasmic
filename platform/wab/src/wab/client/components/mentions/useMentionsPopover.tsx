import DropdownOverlay from "@/wab/client/components/widgets/DropdownOverlay";
import { useElementWidth } from "@/wab/client/hooks/useElementWidth";
import { spawn } from "@/wab/shared/common";
import * as React from "react";
import { useCallback, useState } from "react";
import { useInteractOutside, useOverlayPosition } from "react-aria";

const MAX_MENTION_RESULTS = 50;

/**
 * Generic `@`-mention machinery for a plain text input
 */
export function useMentionsPopover<T>({
  items,
  query,
  anchorElement,
  renderPopoverContent,
  getMatchScore,
  offset = 0,
  matchInputWidth = false,
  onOpen,
  onClose,
  onPick,
}: {
  items: T[];
  /**
   * What the user has typed after the `@`, or `undefined` when the caret is
   * not inside a mention
   */
  query: string | undefined;
  anchorElement: HTMLElement | null;
  /**
   * The popover's contents, or `null` for no popover at all
   */
  renderPopoverContent: (args: {
    /** The mentionable items that matched, ranked best-first. */
    suggestions: T[];
    highlightIndex: number;
    onSelect: (item: T) => void;
  }) => React.ReactElement | null;
  /**
   * Scores how well `item` matches `query` (higher ranks first); return
   * `undefined` to exclude it. Use {@link matchScore} for a default.
   */
  getMatchScore: (item: T, query: string) => number | undefined;
  offset?: number;
  matchInputWidth?: boolean;
  onOpen?: () => Promise<unknown>;
  onClose: () => void;
  /** Called with the item the user picked. */
  onPick: (item: T) => void;
}) {
  const [highlightIndex, setHighlightIndex] = useState(0);
  const mentionActive = query !== undefined;

  React.useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  const [loading, setLoading] = useState(false);

  React.useLayoutEffect(() => {
    if (!mentionActive) {
      return;
    }
    const refresh = onOpen?.();
    if (!refresh) {
      return;
    }
    setLoading(true);
    spawn(refresh.finally(() => setLoading(false)));
  }, [mentionActive, onOpen]);

  const suggestions =
    query === undefined || loading
      ? []
      : items
          .map((item) => ({
            item,
            score: getMatchScore(item, query),
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
    offset,
    crossOffset: 0,
    isOpen: mentionActive,
    shouldFlip: false,
    maxHeight: 240,
  });

  // `anchorElement` does not contain the popover, so a click inside our own
  // popover arrives here as an outside one. Leave those alone; everything
  // else dismisses. Focus survives such clicks because the popover suppresses
  // the default mousedown below.
  useInteractOutside({
    ref: { current: anchorElement },
    onInteractOutside: (event) => {
      if (
        overlayRef.current &&
        overlayRef.current.contains(event.target as Node)
      ) {
        return;
      }

      onClose();
    },
  });

  const handleSelect = useCallback(
    (item: T) => {
      onPick(item);
      onClose();
    },
    [onPick, onClose]
  );

  const onKeyHandler = useCallback(
    (e: React.KeyboardEvent) => {
      if (!mentionActive) {
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (suggestions.length > 0) {
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
        }
      }
    },
    [suggestions, handleSelect, highlightIndex, mentionActive, onClose]
  );

  const popoverContent =
    mentionActive && !loading
      ? renderPopoverContent({
          suggestions,
          highlightIndex,
          onSelect: handleSelect,
        })
      : null;

  const mentionsPopover = popoverContent && (
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
      {/*
       * Suppressing the default mousedown keeps focus in the editor when a
       * row is clicked, so picking with the mouse never blurs. */}
      <div
        data-test-id="mentions-popover"
        onMouseDown={(e) => e.preventDefault()}
      >
        {popoverContent}
      </div>
    </DropdownOverlay>
  );

  return {
    mentionsPopover,
    onKeyHandler,
  };
}
