import {
  FileDragMonitor,
  RemoteFileDragEvent,
} from "@/wab/client/file-drag/file-drag-monitor";

// jsdom has no DragEvent; a MouseEvent with a fake dataTransfer is enough.
function fireDrag(
  target: Window | Element | Text,
  type: string,
  opts: {
    types?: string[];
    relatedTarget?: Element | null;
  } = {}
) {
  // `instanceof Window` is per-realm, so it fails for iframe windows.
  const win =
    "ownerDocument" in target ? target.ownerDocument.defaultView! : target;
  // Use the window's own realm so jsdom accepts the event on that window.
  const e = new (win as unknown as typeof globalThis).MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    relatedTarget: opts.relatedTarget ?? null,
  });
  Object.defineProperty(e, "dataTransfer", {
    value: { types: opts.types ?? ["Files"] },
  });
  target.dispatchEvent(e);
}

function firePointerMove(win: Window) {
  win.dispatchEvent(
    new (win as unknown as typeof globalThis).MouseEvent("pointermove", {
      bubbles: true,
    })
  );
}

function mkIframeWindow(parent: Element = document.body): Window {
  const iframe = document.createElement("iframe");
  parent.appendChild(iframe);
  return iframe.contentWindow!;
}

/** `<div id=target><div id=child/></div><div id=sibling/>` */
function mkTarget() {
  const target = document.createElement("div");
  const child = document.createElement("div");
  target.appendChild(child);
  const sibling = document.createElement("div");
  document.body.append(target, sibling);
  return { target, child, sibling };
}

function remoteEvent(
  type: RemoteFileDragEvent["type"],
  timestamp = Date.now()
): RemoteFileDragEvent {
  return { type, timestamp };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("FileDragMonitor", () => {
  it("ignores drags that don't carry files", () => {
    const monitor = new FileDragMonitor();
    const untrack = monitor.addWindowListeners(window);
    fireDrag(window, "dragover", { types: ["text/plain"] });
    expect(monitor.isDraggingFiles()).toBe(false);
    untrack();
  });

  it("ends when no drag events arrive for 500ms", () => {
    const monitor = new FileDragMonitor();
    const untrack = monitor.addWindowListeners(window);
    fireDrag(window, "dragover");
    vi.advanceTimersByTime(499);
    expect(monitor.isDraggingFiles()).toBe(true);
    vi.advanceTimersByTime(1);
    // The resulting dragend takes effect on the next tick.
    vi.runOnlyPendingTimers();
    expect(monitor.isDraggingFiles()).toBe(false);
    untrack();
  });

  it("ends on pointermove, which a native drag suppresses", () => {
    const monitor = new FileDragMonitor();
    const untrack = monitor.addWindowListeners(window);
    fireDrag(window, "dragover");
    firePointerMove(window);
    vi.runOnlyPendingTimers();
    expect(monitor.isDraggingFiles()).toBe(false);
    untrack();
  });

  it("follows the remote frame's events", () => {
    const monitor = new FileDragMonitor();
    monitor.onRemoteEvent(remoteEvent("dragenter"));
    expect(monitor.isDraggingFiles()).toBe(true);

    monitor.onRemoteEvent(remoteEvent("drop"));
    vi.runOnlyPendingTimers();
    expect(monitor.isDraggingFiles()).toBe(false);
  });

  it("stops listening on untrack", () => {
    const monitor = new FileDragMonitor();
    const artboard = mkIframeWindow();
    const untrack = monitor.addWindowListeners(artboard);

    fireDrag(artboard, "dragover");
    expect(monitor.isDraggingFiles()).toBe(true);
    vi.advanceTimersByTime(1000);

    untrack();
    fireDrag(artboard, "dragover");
    expect(monitor.isDraggingFiles()).toBe(false);
  });

  describe("subscribe/subscribeRemote/onEvent", () => {
    it("sends local events to both, remote events to subscribe only", () => {
      const monitor = new FileDragMonitor();
      const { target } = mkTarget();
      const untrack = monitor.addWindowListeners(window);
      const local = vi.fn();
      const remote = vi.fn();
      monitor.subscribe(local);
      monitor.subscribeRemote(remote);

      vi.setSystemTime(1000);
      fireDrag(target, "dragenter");
      expect(local).toHaveBeenCalledTimes(1);
      expect(local).toHaveBeenCalledWith(
        expect.objectContaining({ type: "dragenter", local: true, target })
      );
      expect(remote).toHaveBeenCalledTimes(1);
      expect(remote).toHaveBeenCalledWith({
        type: "dragenter",
        timestamp: 1000,
      });

      monitor.onRemoteEvent(remoteEvent("dragover", 2000));
      expect(local).toHaveBeenCalledTimes(2);
      expect(local).toHaveBeenLastCalledWith({
        type: "dragover",
        timestamp: 2000,
      });
      expect(remote).toHaveBeenCalledTimes(1);
      untrack();
    });
  });

  describe("isDraggingFilesOver", () => {
    it("follows the element under the pointer", () => {
      const monitor = new FileDragMonitor();
      const { target, child, sibling } = mkTarget();
      const untrack = monitor.addWindowListeners(window);
      expect(monitor.isDraggingFilesOver(target)).toBe(false);

      fireDrag(child, "dragenter");
      expect(monitor.isDraggingFilesOver(target)).toBe(true);
      expect(monitor.isDraggingFilesOver(sibling)).toBe(false);

      fireDrag(sibling, "dragenter");
      expect(monitor.isDraggingFilesOver(target)).toBe(false);
      expect(monitor.isDraggingFilesOver(sibling)).toBe(true);
      untrack();
    });

    it("stays over the target while moving onto a child", () => {
      const monitor = new FileDragMonitor();
      const { target, child, sibling } = mkTarget();
      const untrack = monitor.addWindowListeners(window);

      // Browsers fire dragenter on the child, then dragleave on the parent
      // with the child as relatedTarget.
      fireDrag(target, "dragenter");
      fireDrag(child, "dragenter");
      fireDrag(target, "dragleave", { relatedTarget: child });
      expect(monitor.isDraggingFilesOver(target)).toBe(true);

      fireDrag(sibling, "dragenter");
      fireDrag(child, "dragleave", { relatedTarget: sibling });
      expect(monitor.isDraggingFilesOver(target)).toBe(false);
      untrack();
    });

    it("recovers on the next dragover when a dragleave has no relatedTarget", () => {
      const monitor = new FileDragMonitor();
      const { target, child } = mkTarget();
      const untrack = monitor.addWindowListeners(window);

      fireDrag(child, "dragenter");
      fireDrag(target, "dragleave", { relatedTarget: null });
      expect(monitor.isDraggingFilesOver(target)).toBe(false);

      fireDrag(child, "dragover");
      expect(monitor.isDraggingFilesOver(target)).toBe(true);
      untrack();
    });

    it("handles targets that aren't Elements", () => {
      const monitor = new FileDragMonitor();
      const { target, child } = mkTarget();
      const text = child.appendChild(document.createTextNode("text"));
      const untrack = monitor.addWindowListeners(window);

      // A Text node resolves to its parent element.
      fireDrag(text, "dragenter");
      expect(monitor.isDraggingFilesOver(target)).toBe(true);

      // The Window itself is over no element.
      fireDrag(window, "dragover");
      expect(monitor.isDraggingFiles()).toBe(true);
      expect(monitor.isDraggingFilesOver(target)).toBe(false);
      untrack();
    });

    it("includes a tracked window nested in the target", () => {
      const monitor = new FileDragMonitor();
      const { target, sibling } = mkTarget();
      const artboard = mkIframeWindow(target);
      const untrackTop = monitor.addWindowListeners(window);
      const untrackArtboard = monitor.addWindowListeners(artboard);

      fireDrag(artboard.document.body, "dragenter");
      expect(monitor.isDraggingFilesOver(target)).toBe(true);
      expect(monitor.isDraggingFilesOver(sibling)).toBe(false);

      untrackTop();
      untrackArtboard();
    });

    it("ends on drop", () => {
      const monitor = new FileDragMonitor();
      const { target } = mkTarget();
      const untrack = monitor.addWindowListeners(window);

      fireDrag(target, "dragenter");
      expect(monitor.isDraggingFilesOver(target)).toBe(true);
      fireDrag(target, "drop");
      expect(monitor.isDraggingFilesOver(target)).toBe(false);
      untrack();
    });

    it("is false while the drag is over the other frame, ignoring remote events within 10ms of a local one", () => {
      const monitor = new FileDragMonitor();
      const { target } = mkTarget();
      const untrack = monitor.addWindowListeners(window);

      monitor.onRemoteEvent(remoteEvent("dragenter"));
      expect(monitor.isDraggingFiles()).toBe(true);
      expect(monitor.isDraggingFilesOver(target)).toBe(false);

      vi.setSystemTime(1000);
      fireDrag(target, "dragenter");
      expect(monitor.isDraggingFilesOver(target)).toBe(true);

      // The other frame's trailing events arrive a message hop later.
      vi.advanceTimersByTime(9);
      monitor.onRemoteEvent(remoteEvent("dragover"));
      expect(monitor.isDraggingFilesOver(target)).toBe(true);

      // Chrome fires no dragleave in an iframe when the pointer moves onto
      // the parent document, so only the other frame's events say it left.
      vi.advanceTimersByTime(1);
      monitor.onRemoteEvent(remoteEvent("dragover"));
      expect(monitor.isDraggingFilesOver(target)).toBe(false);
      expect(monitor.isDraggingFiles()).toBe(true);
      untrack();
    });
  });
});
