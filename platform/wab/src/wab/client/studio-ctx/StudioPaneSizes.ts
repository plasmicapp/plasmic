import { LEFT_PANE_INIT_WIDTH } from "@/wab/client/ClientConstants";
import {
  bottomPanelAlignmentKey,
  bottomPanelHeightKey,
  rightPaneWidthKey,
} from "@/wab/client/LocalStorageKey";
import type {
  BottomPanelAlignment,
  BottomPanelSlotId,
} from "@/wab/client/components/BottomPanelState";
import { observable } from "mobx";

const AUTO_CENTERED_MIN_VIEWPORT_WIDTH = 1600;

function readStored(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

/** Studio-owned pane dimensions; views only measure and report user resizes. */
export class StudioPaneSizes {
  private readonly leftWidthBox = observable.box(LEFT_PANE_INIT_WIDTH);
  private readonly rightWidthBox = observable.box<number | undefined>(
    readStored(rightPaneWidthKey) ?? undefined,
  );
  private readonly alignmentBox = observable.box<BottomPanelAlignment>(
    readStored(bottomPanelAlignmentKey) ?? "auto",
  );
  private readonly heightBox = observable.box<number>(
    readStored(bottomPanelHeightKey) ?? Math.round(window.innerHeight * 0.4),
  );
  private readonly wideViewport = observable.box(false);

  constructor() {
    this.syncViewportWidth();
  }
  get leftWidth() {
    return this.leftWidthBox.get();
  }
  set leftWidth(value: number) {
    this.leftWidthBox.set(value);
  }
  get rightWidth() {
    return this.rightWidthBox.get();
  }
  set rightWidth(value: number | undefined) {
    this.rightWidthBox.set(value);
  }
  commitRightWidth(value: number) {
    this.rightWidth = value;
    localStorage.setItem(rightPaneWidthKey, JSON.stringify(value));
  }
  get alignment() {
    return this.alignmentBox.get();
  }
  set alignment(value: BottomPanelAlignment) {
    this.alignmentBox.set(value);
    localStorage.setItem(bottomPanelAlignmentKey, JSON.stringify(value));
  }
  /** Live height during a drag; only `commitHeight` persists it. */
  get height() {
    return this.heightBox.get();
  }
  set height(value: number) {
    this.heightBox.set(value);
  }
  commitHeight(value: number) {
    this.height = value;
    localStorage.setItem(bottomPanelHeightKey, JSON.stringify(value));
  }
  get activeSlot(): BottomPanelSlotId {
    const alignment = this.alignment;
    if (alignment === "auto") {
      return this.wideViewport.get() ? "center" : "bottom";
    }
    return alignment === "centered" ? "center" : "bottom";
  }

  syncViewportWidth() {
    this.wideViewport.set(
      window.innerWidth >= AUTO_CENTERED_MIN_VIEWPORT_WIDTH,
    );
  }
}
