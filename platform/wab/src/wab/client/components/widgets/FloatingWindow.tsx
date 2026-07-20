import { isWithinPointerInteractiveElement } from "@/wab/client/dom-utils";
import { LocalStorageKey } from "@/wab/client/LocalStorageKey";
import { Box, Pt } from "@/wab/shared/geom";
import cn from "classnames";
import L from "lodash";
import React from "react";

/**
 * Layer that contains {@link FloatingWindow}s.
 *
 * There should be one per frame (top frame always above host frame).
 */
export function FloatingWindowLayer({ children }: React.PropsWithChildren<{}>) {
  return <div className="floating-window-screen">{children}</div>;
}

const VIEWPORT_MARGIN = 10;
const DEFAULT_MIN_HEIGHT = 100;

const RESIZE_DIRECTIONS = [
  "n",
  "s",
  "e",
  "w",
  // Corners last so they win over edges.
  "ne",
  "nw",
  "se",
  "sw",
] as const;
type ResizeDirection = (typeof RESIZE_DIRECTIONS)[number];

interface WindowState {
  offset: Pt;
  width?: number;
  height?: number;
}

/**
 * A persistent, draggable, resizable window that renders over most UI layers.
 * The window should have a handle which is used for dragging.
 */
export function FloatingWindow({
  handleSelector,
  storageKey,
  focusedMode,
  minWidth,
  minHeight,
  disableWidthResize,
  disableHeightResize,
  className,
  children,
  style,
  onPointerDown,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  /** Selector for the drag-handle region to detect drags. */
  handleSelector: string;
  /** If set, stores the last position and size of the window here. */
  storageKey?: LocalStorageKey;
  /** Opens the window below the focused toolbar. */
  focusedMode?: boolean;
  minWidth?: number;
  minHeight?: number;
  disableWidthResize?: boolean;
  disableHeightResize?: boolean;
}) {
  const windowRef = React.useRef<HTMLDivElement>(null);

  const resolveMinWidth = () => minWidth ?? measureMinWidth(windowRef.current);
  const resolveMinHeight = () => minHeight ?? DEFAULT_MIN_HEIGHT;

  const loadedState = React.useMemo(
    () => loadWindowState(storageKey),
    [storageKey]
  );
  const [offset, setOffset] = React.useState<Pt>(
    loadedState?.offset ?? Pt.zero()
  );
  const [width, setWidth] = React.useState<number | undefined>(
    loadedState?.width
  );
  const [height, setHeight] = React.useState<number | undefined>(
    loadedState?.height
  );

  // Ensure the initial/loaded window state is within bounds.
  React.useLayoutEffect(() => {
    const windowEl = windowRef.current;
    if (!windowEl) {
      return;
    }
    const win = windowEl.ownerDocument.defaultView ?? window;

    // Check width/height.
    const windowBox = windowEl.getBoundingClientRect();
    let newWidth = width;
    let newHeight = height;
    if (width !== undefined) {
      const maxWidth = windowBox.right - VIEWPORT_MARGIN;
      if (width > maxWidth) {
        newWidth = Math.max(resolveMinWidth(), maxWidth);
        windowEl.style.width = `${newWidth}px`;
      }
    }
    if (height !== undefined) {
      const maxHeight = win.innerHeight - VIEWPORT_MARGIN - windowBox.top;
      if (height > maxHeight) {
        newHeight = Math.max(resolveMinHeight(), maxHeight);
        windowEl.style.height = `${newHeight}px`;
      }
    }
    setWidth(newWidth);
    setHeight(newHeight);

    // Check offset.
    const clampedDelta = clampDelta(
      0,
      0,
      getHandleBox(windowEl, handleSelector),
      win
    );
    setOffset(offset.plus(clampedDelta));
  }, [focusedMode, handleSelector]);

  const lastWindowStateRef = React.useRef<WindowState>({
    offset,
    width,
    height,
  });
  lastWindowStateRef.current = { offset, width, height };
  const storeLastState = () => {
    storeWindowState(storageKey, lastWindowStateRef.current);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(e);

    const windowEl = windowRef.current;
    if (!windowEl) {
      return;
    }

    const handle = windowEl.querySelector<HTMLElement>(handleSelector);
    const target = e.target as HTMLElement;
    if (
      !handle ||
      !handle.contains(target) ||
      isWithinPointerInteractiveElement(target)
    ) {
      return;
    }

    const startOffset = offset;
    const startHandleBox = Box.fromRectSides(handle.getBoundingClientRect());
    const win = windowEl.ownerDocument.defaultView ?? window;
    startPointerDrag(e, handle, {
      onMove: (dx, dy) => {
        setOffset(startOffset.plus(clampDelta(dx, dy, startHandleBox, win)));
      },
      onEnd: storeLastState,
    });
  };

  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    dir: ResizeDirection
  ) => {
    const windowEl = windowRef.current;
    if (!windowEl) {
      return;
    }

    const startOffset = offset;
    const startWindowBox = Box.fromRectSides(windowEl.getBoundingClientRect());
    const win = windowEl.ownerDocument.defaultView ?? window;
    startPointerDrag(e, e.currentTarget, {
      onMove: (dx, dy) => {
        const maxRight = win.innerWidth - VIEWPORT_MARGIN;
        const maxBottom = win.innerHeight - VIEWPORT_MARGIN;
        const newBox = startWindowBox.withSides({
          ...(dir.includes("e") && {
            right: L.clamp(
              startWindowBox.right() + dx,
              Math.min(startWindowBox.left() + resolveMinWidth(), maxRight),
              maxRight
            ),
          }),
          ...(dir.includes("w") && {
            left: L.clamp(
              startWindowBox.left() + dx,
              VIEWPORT_MARGIN,
              Math.max(
                VIEWPORT_MARGIN,
                startWindowBox.right() - resolveMinWidth()
              )
            ),
          }),
          ...(dir.includes("s") && {
            bottom: L.clamp(
              startWindowBox.bottom() + dy,
              Math.min(startWindowBox.top() + resolveMinHeight(), maxBottom),
              maxBottom
            ),
          }),
          ...(dir.includes("n") && {
            top: L.clamp(
              startWindowBox.top() + dy,
              VIEWPORT_MARGIN,
              Math.max(
                VIEWPORT_MARGIN,
                startWindowBox.bottom() - resolveMinHeight()
              )
            ),
          }),
        });
        if (dir.includes("e") || dir.includes("w")) {
          setWidth(newBox.width());
        }
        if (dir.includes("n") || dir.includes("s")) {
          setHeight(newBox.height());
        }
        setOffset(
          startOffset.moveBy(
            newBox.right() - startWindowBox.right(),
            newBox.top() - startWindowBox.top()
          )
        );
      },
      onEnd: storeLastState,
    });
  };

  return (
    <div
      {...rest}
      ref={windowRef}
      className={cn(className, {
        "floating-window": true,
        "floating-window--focused": focusedMode,
        // Need extra CSS to auto-size height only.
        "floating-window--auto-height": height === undefined,
      })}
      style={{
        ...style,
        width,
        height,
        transform: `translate(${offset.x}px, ${offset.y}px)`,
      }}
      onPointerDown={handlePointerDown}
    >
      <div className="floating-window__content">{children}</div>
      {RESIZE_DIRECTIONS.filter((dir) => {
        if (disableWidthResize && (dir.includes("e") || dir.includes("w"))) {
          return false;
        }
        if (disableHeightResize && (dir.includes("n") || dir.includes("s"))) {
          return false;
        }
        return true;
      }).map((dir) => (
        <div
          key={dir}
          className={`floating-window--resizer--${dir}`}
          onPointerDown={(e) => handleResizePointerDown(e, dir)}
        />
      ))}
    </div>
  );
}

function storeWindowState(
  storageKey: LocalStorageKey | undefined,
  state: WindowState
): void {
  if (!storageKey) {
    return;
  }
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        x: state.offset.x,
        y: state.offset.y,
        width: state.width,
        height: state.height,
      })
    );
  } catch (error) {
    console.warn(error);
  }
}

function loadWindowState(
  storageKey: LocalStorageKey | undefined
): WindowState | undefined {
  if (!storageKey) {
    return undefined;
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return undefined;
    }

    const parsed = JSON.parse(raw);
    const x = parseNumber(parsed.x);
    const y = parseNumber(parsed.y);
    const width = parseNumber(parsed.width);
    const height = parseNumber(parsed.height);
    if (x === undefined || y === undefined) {
      return undefined;
    }

    return {
      offset: new Pt(x, y),
      width,
      height,
    };
  } catch (error) {
    console.warn(error);
    return undefined;
  }
}

function parseNumber(val: unknown): number | undefined {
  if (typeof val === "number" && L.isFinite(val)) {
    return val;
  } else {
    return undefined;
  }
}

/** Focuses the target or its closest focusable ancestor. */
function focusClosest(target: HTMLElement): HTMLElement | undefined {
  let cur: HTMLElement | null = target;
  while (cur) {
    cur.focus();
    if (cur.ownerDocument.activeElement === cur) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return undefined;
}

function measureMinWidth(windowEl: HTMLElement | null): number {
  if (!windowEl) {
    return 0;
  }

  const prev = windowEl.style.width;
  windowEl.style.width = "min-content";
  const size = windowEl.getBoundingClientRect().width;
  windowEl.style.width = prev;
  return size;
}

/** Get bounding box of handle (falls back to window). */
function getHandleBox(windowEl: HTMLElement, handleSelector: string): Box {
  return Box.fromRectSides(
    (windowEl.querySelector(handleSelector) ?? windowEl).getBoundingClientRect()
  );
}

/** Clamps dx, dy to ensure the entire handle box stays within the window. */
function clampDelta(dx: number, dy: number, handleBox: Box, win: Window): Pt {
  const validTopLefts = Box.fromRectSides({
    top: 0,
    left: 0,
    right: win.innerWidth - handleBox.width(),
    bottom: win.innerHeight - handleBox.height(),
  });
  return validTopLefts
    .clamp(handleBox.topLeft().moveBy(dx, dy))
    .sub(handleBox.topLeft());
}

function startPointerDrag(
  downEvent: React.PointerEvent,
  target: HTMLElement,
  callbacks: {
    onMove?: (deltaX: number, deltaY: number, ev: PointerEvent) => void;
    onEnd?: (ev: PointerEvent) => void;
  }
): void {
  if (downEvent.button !== 0 || !downEvent.isPrimary) {
    return;
  }

  // Prevent default and imitate default behavior to focus the element.
  downEvent.preventDefault();
  focusClosest(target);

  const pointerId = downEvent.pointerId;
  const startX = downEvent.clientX;
  const startY = downEvent.clientY;
  const doc = target.ownerDocument;
  const body = doc.body;
  const prevUserSelect = body.style.userSelect;

  const move = (moveEvent: PointerEvent) => {
    if (moveEvent.pointerId !== pointerId) {
      return;
    }

    moveEvent.preventDefault();
    callbacks.onMove?.(
      moveEvent.clientX - startX,
      moveEvent.clientY - startY,
      moveEvent
    );
  };

  let ended = false;
  const end = (endEvent: PointerEvent) => {
    if (ended) {
      return;
    }

    if (
      endEvent.pointerId !== pointerId &&
      endEvent.type !== "lostpointercapture"
    ) {
      return;
    }

    body.style.userSelect = prevUserSelect;
    target.removeEventListener("lostpointercapture", end);
    doc.removeEventListener("pointermove", move);
    doc.removeEventListener("pointerup", end);
    doc.removeEventListener("pointercancel", end);
    callbacks.onEnd?.(endEvent);
    ended = true;
  };

  // setPointerCapture tells the browser to capture events in the current
  // target element and frame. If we lose pointer capture, end the drag.
  target.setPointerCapture(pointerId);
  target.addEventListener("lostpointercapture", end);
  // Listening for events on the document is more reliable in case the event
  // is triggered on a different element due to moving/resizing lag.
  doc.addEventListener("pointermove", move);
  doc.addEventListener("pointerup", end);
  doc.addEventListener("pointercancel", end);
  body.style.userSelect = "none";
}
