import { useQuerySelector } from "@/wab/client/tours/tutorials/useQuerySelector";
import type { PopperOffsetsModifier } from "@popperjs/core/lib/modifiers/popperOffsets";
import type { Modifier } from "@popperjs/core/lib/popper-lite";
import { createPopper } from "@popperjs/core/lib/popper-lite";
import React from "react";

/** How much taller and wider the highlight will be relative to the target. */
const HIGHLIGHT_PADDING = 4;

export interface TutorialHighlightEffectProps {
  /** CSS selector to apply highlight effect to. */
  target: string;
  /** CSS selector of container target should be found in. */
  targetContainer: string;
  /** Z-index of highlight effect. */
  zIndex: number;
}

export function TutorialHighlightEffect({
  target,
  targetContainer,
  zIndex,
}: TutorialHighlightEffectProps) {
  const popperRef = React.useRef<HTMLDivElement | null>(null);

  const targetContainerEl = React.useMemo(() => {
    if (targetContainer === target) {
      // useQuerySelector doesn't work if the target and container are the same.
      // So apply a little hack here to switch the container to the parent element.
      return document.querySelector(targetContainer)?.parentElement;
    } else {
      return document.querySelector(targetContainer);
    }
  }, []);
  if (!targetContainerEl) {
    throw new Error(
      `targetContainer element with selector '${targetContainer}' not found`
    );
  }

  const targetEl = useQuerySelector(targetContainerEl, target);
  React.useEffect(() => {
    if (!popperRef.current || !targetEl) {
      return;
    }

    const popperInstance = createPopper(targetEl, popperRef.current, {
      modifiers: [popperOffsetsOrigin, matchSize],
    });
    return popperInstance.destroy;
  }, [popperRef.current, targetEl]);

  return (
    <div
      ref={popperRef}
      id="tutorial-popper"
      style={{
        zIndex,
        pointerEvents: "none",
        borderRadius: 16,
        padding: HIGHLIGHT_PADDING,
        animation: "tutorial-highlight 2s infinite",
      }}
    />
  );
}

/** Positions the popper on the reference element (i.e. stacked on top). */
const popperOffsetsOrigin: PopperOffsetsModifier = {
  name: "popperOffsets",
  enabled: true,
  phase: "read",
  fn({ state, name }) {
    state.modifiersData[name] = {
      x: state.rects.reference.x - HIGHLIGHT_PADDING,
      y: state.rects.reference.y - HIGHLIGHT_PADDING,
    };
  },
  data: {},
};

// Based on https://github.com/floating-ui/floating-ui/issues/794#issuecomment-644034386
/** Matches the popper size to the target element. */
const matchSize: Modifier<"matchSize", {}> = {
  name: "matchSize",
  enabled: true,
  phase: "beforeWrite",
  requires: ["computeStyles"],
  fn({ state }) {
    state.styles.popper.height = `${
      state.rects.reference.height + 2 * HIGHLIGHT_PADDING
    }px`;
    state.styles.popper.width = `${
      state.rects.reference.width + 2 * HIGHLIGHT_PADDING
    }px`;
  },
  effect({ state }) {
    const rect = state.elements.reference.getBoundingClientRect();
    state.elements.popper.style.height = `${
      rect.height + 2 * HIGHLIGHT_PADDING
    }px`;
    state.elements.popper.style.width = `${
      rect.width + 2 * HIGHLIGHT_PADDING
    }px`;
  },
};
