import {
  bottomPanelAlignmentKey,
  bottomPanelHeightKey,
  rightPaneWidthKey,
} from "@/wab/client/LocalStorageKey";
import { BottomPanelState } from "@/wab/client/components/BottomPanelState";
import { StudioPaneSizes } from "@/wab/client/studio-ctx/StudioPaneSizes";

beforeEach(() => localStorage.clear());

it("shares live sizes with the bottom panel and persists only completed resizes", () => {
  const sizes = new StudioPaneSizes();
  const bottom = new BottomPanelState(sizes);
  sizes.rightWidth = 420;
  bottom.height = 350;
  expect(sizes.height).toBe(350);
  expect(localStorage.getItem(rightPaneWidthKey)).toBeNull();
  expect(localStorage.getItem(bottomPanelHeightKey)).toBeNull();
  sizes.commitRightWidth(430);
  bottom.commitHeight(360);
  bottom.alignment = "centered";
  const restored = new StudioPaneSizes();
  expect(restored.rightWidth).toBe(430);
  expect(restored.height).toBe(360);
  expect(restored.activeSlot).toBe("center");
  expect(localStorage.getItem(bottomPanelAlignmentKey)).toBe('"centered"');
});

it("changes automatic alignment with the viewport without overwriting the preference", () => {
  const sizes = new StudioPaneSizes();
  const original = window.innerWidth;
  try {
    window.innerWidth = 1800;
    sizes.syncViewportWidth();
    expect(sizes.activeSlot).toBe("center");
    window.innerWidth = 1200;
    sizes.syncViewportWidth();
    expect(sizes.activeSlot).toBe("bottom");
    expect(sizes.alignment).toBe("auto");
  } finally {
    window.innerWidth = original;
  }
});
