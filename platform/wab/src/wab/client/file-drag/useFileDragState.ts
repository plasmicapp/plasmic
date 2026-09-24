import { fileDragMonitor } from "@/wab/client/file-drag/file-drag-monitor";
import * as React from "react";

export type FileDragState = "dragging" | "draggingOver" | false;

/**
 * Checks whether and where a user is dragging a file.
 * - "draggingOver" if the user is dragging a file over `el`
 * - "dragging" if the user is dragging a file anywhere in the app
 * - `false` if the user is not dragging a file
 */
export function useFileDragState(el: Element | null): FileDragState {
  return React.useSyncExternalStore(fileDragMonitor.subscribe, () =>
    el !== null && fileDragMonitor.isDraggingFilesOver(el)
      ? "draggingOver"
      : fileDragMonitor.isDraggingFiles()
        ? "dragging"
        : false,
  );
}
