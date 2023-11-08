import { RefObject, useCallback, useEffect, useMemo, useRef } from "react";
import {
  plasmicIFrameMouseDownEvent,
  plasmicIFrameWheelEvent,
} from "../definitions/events";
import { isDescendant } from "../dom-utils";

/**
 * Makes it possible to monitor dismissing events on the
 * Studio UI for a given overlay element
 *
 * @param onDismiss   Will be called when any dismiss event is triggered
 * @param overlayRef  DOM reference to the overlay root element
 * @param isOpen      Tells the hook whether the overlay is open or not
 */
export function useDismissibleStudioOverlay({
  onDismiss,
  overlayRef,
  isOpen = true,
}: {
  onDismiss: (e: Event) => any;
  isOpen?: boolean;
  overlayRef?: RefObject<HTMLElement>;
}) {
  const studio = useMemo(() => document.querySelector(".studio"), []);
  const _onDismissRef = useRef(onDismiss);
  const _activeRef = useRef(isOpen);
  _onDismissRef.current = onDismiss;
  _activeRef.current = isOpen;

  const _onDismiss = useCallback((e: Event) => {
    if (e.type === "keydown" && (e as any).key !== "Escape") {
      return;
    }

    if (!_activeRef.current) {
      return;
    }

    // Should NOT dismiss if the event target
    // is descendant of the overlay container
    if (
      overlayRef &&
      isDescendant({
        parent: overlayRef.current as HTMLElement,
        child: e.target as HTMLElement,
      })
    ) {
      return e.stopPropagation();
    }

    const currentOnDismissFn = _onDismissRef.current;
    currentOnDismissFn(e);
  }, []);

  const addListeners = useCallback(() => {
    studio?.addEventListener("wheel", _onDismiss);
    document.addEventListener("mousedown", _onDismiss);
    document.addEventListener("keydown", _onDismiss); // for Escape only
    document.addEventListener("wheel", _onDismiss);
    document.addEventListener("contextmenu", _onDismiss);
    document.addEventListener(plasmicIFrameWheelEvent, _onDismiss);
    document.addEventListener(plasmicIFrameMouseDownEvent, _onDismiss);
  }, []);

  const removeListeners = useCallback(() => {
    studio?.removeEventListener("wheel", _onDismiss);
    document.removeEventListener("keydown", _onDismiss);
    document.removeEventListener("wheel", _onDismiss);
    document.removeEventListener("mousedown", _onDismiss);
    document.removeEventListener("contextmenu", _onDismiss);
    document.removeEventListener(plasmicIFrameWheelEvent, _onDismiss);
    document.removeEventListener(plasmicIFrameMouseDownEvent, _onDismiss);
  }, []);

  return useEffect(() => {
    addListeners();

    return removeListeners;
  }, []);
}
