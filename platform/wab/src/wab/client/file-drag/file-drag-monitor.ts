import { isDescendant } from "@/wab/client/dom-utils";

const fileDragEventTypes = [
  "dragenter",
  "dragover",
  "dragleave",
  "drop",
  "dragend",
] as const;
export type FileDragEventType = (typeof fileDragEventTypes)[number];

/** Remote drag events can't contain Elements since they can't travel over Comlink. */
export interface RemoteFileDragEvent {
  type: FileDragEventType;
  timestamp: number;
}

/** Local drag events can include all the event data. */
export interface LocalFileDragEvent extends RemoteFileDragEvent {
  local: true;
  target: Element | null;
  /** For `dragleave`, the element being entered. */
  relatedTarget: Element | null;
}

export type FileDragEvent = LocalFileDragEvent | RemoteFileDragEvent;

function isLocal(e: FileDragEvent): e is LocalFileDragEvent {
  return "local" in e;
}

/** Tracks OS file drags. */
export class FileDragMonitor {
  private lastEvent: FileDragEvent | undefined;
  /** Pending while a drag is active; ends it when it fires. */
  private endTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly listeners = new Set<(event: FileDragEvent) => void>();

  isDraggingFiles(): boolean {
    return this.endTimer !== undefined;
  }

  isDraggingFilesOver(el: Element): boolean {
    const event = this.lastEvent;
    if (!this.isDraggingFiles() || !event || !isLocal(event)) {
      return false;
    }

    switch (event.type) {
      case "dragenter":
      case "dragover":
        return event.target !== null && isSelfOrDescendant(el, event.target);
      case "dragleave":
        return (
          event.relatedTarget !== null &&
          isSelfOrDescendant(el, event.relatedTarget)
        );
      default:
        return false;
    }
  }

  /** Tracks drags in `win` until the returned function is called. */
  addWindowListeners(win: Window): () => void {
    const onDrag = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        this.onEvent({
          type: e.type as FileDragEventType,
          timestamp: Date.now(),
          local: true,
          target: toElement(e.target),
          relatedTarget: toElement(e.relatedTarget),
        });
      }
    };
    const onPointerMove = () => {
      if (this.isDraggingFiles() && this.lastEvent?.type !== "dragend") {
        this.onEvent({
          type: "dragend",
          timestamp: Date.now(),
          local: true,
          target: null,
          relatedTarget: null,
        });
      }
    };
    for (const type of fileDragEventTypes) {
      win.addEventListener(type, onDrag, true);
    }
    win.addEventListener("pointermove", onPointerMove, true);
    return () => {
      for (const type of fileDragEventTypes) {
        win.removeEventListener(type, onDrag, true);
      }
      win.removeEventListener("pointermove", onPointerMove, true);
    };
  }

  onRemoteEvent(event: RemoteFileDragEvent): void {
    return this.onEvent(event);
  }

  private onEvent(event: FileDragEvent): void {
    // Ignore new event if...
    if (
      // Last event is local, and
      this.lastEvent &&
      isLocal(this.lastEvent) &&
      // New event is remote and within 10ms of last local event
      !isLocal(event) &&
      this.lastEvent.timestamp > event.timestamp - 10
    ) {
      return;
    }
    this.lastEvent = event;

    clearTimeout(this.endTimer);
    switch (event.type) {
      case "dragenter":
      case "dragover":
      case "dragleave":
        // Assume the drag ended if we don't see any other events within 500ms.
        this.endTimer = setTimeout(
          () =>
            this.onEvent({
              type: "dragend",
              timestamp: Date.now(),
              local: true,
              target: null,
              relatedTarget: null,
            }),
          500,
        );
        this.notify(event);
        break;
      case "drop":
      case "dragend":
        // Delay until the next tick to ensure React components that are
        // conditionally rendered based on `isDraggingFiles()` process the
        // event before unmounting.
        setTimeout(() => {
          this.endTimer = undefined;
          this.notify(event);
        }, 0);
    }
  }

  /** Subscribes to all events. */
  readonly subscribe = (
    listener: (event: FileDragEvent) => void,
  ): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Subscribes to events that should be sent to remote frames. */
  readonly subscribeRemote = (
    listener: (event: RemoteFileDragEvent) => void,
  ): (() => void) => {
    return this.subscribe((event) => {
      if (isLocal(event)) {
        listener({
          type: event.type,
          timestamp: event.timestamp,
        });
      }
    });
  };

  private notify(event: FileDragEvent) {
    this.listeners.forEach((listener) => listener(event));
  }
}

/**
 * Drag event targets aren't always Elements: a listener on a Window can see
 * the Window or Document itself, and some browsers target Text nodes.
 * Duck-typed because `instanceof Element` fails across frames.
 */
function toElement(target: EventTarget | null): Element | null {
  if (!target || !("nodeType" in target)) {
    return null;
  }
  const node = target as Node;
  return node.nodeType === Node.ELEMENT_NODE
    ? (node as Element)
    : node.parentElement;
}

function isSelfOrDescendant(el: Element, target: Element): boolean {
  return (
    target === el ||
    isDescendant({ parent: el, child: target, crossFrame: true })
  );
}

/** Singleton monitor for this frame. */
export const fileDragMonitor = new FileDragMonitor();
fileDragMonitor.addWindowListeners(window);
