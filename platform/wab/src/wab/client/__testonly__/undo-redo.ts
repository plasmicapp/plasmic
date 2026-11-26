import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { Bundler } from "@/wab/shared/bundler";
import { assert } from "@/wab/shared/common";
import { isEqual } from "lodash";

/** Checks that undo and redo restore the full site when the tool changes it. */
export async function expectUndoRedo<T>(
  studioCtx: StudioCtx,
  change: () => Promise<T>,
): Promise<T> {
  assert(
    !studioCtx.appCtx.appConfig.noObserve,
    "noObserve records no changes, so undo has nothing to restore",
  );
  const bundler = new Bundler();
  const snapshot = () => bundler.bundle(studioCtx.site, "site", "0");

  if (!studioCtx.canUndo()) {
    // Studio records the initial view on load; undo restores to it.
    studioCtx.createViewStateUndoRecord();
  }
  const before = snapshot();
  const result = await change();
  const after = snapshot();
  if (isEqual(before, after)) {
    return result;
  }

  await studioCtx.undo();
  expect(snapshot(), "after undo").toEqual(before);
  await studioCtx.redo();
  expect(snapshot(), "after redo").toEqual(after);
  return result;
}
