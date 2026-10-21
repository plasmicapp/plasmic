import { expect, Frame, Page } from "@playwright/test";
import { test } from "../fixtures/test";
import {
  getStudioWindowFrame,
  goToProject,
  setE2eDevFlags,
  waitForArenaFrames,
} from "../utils/studio-utils";

// Studio keeps only `liveArenas` arenas rendered. Each component gets its own
// arena, so visiting more components than that evicts the earlier arenas and
// disposes their canvas frames.
const LIVE_ARENAS = 2;
const NUM_COMPONENTS = 8;

/**
 * Returns how many documents in the page's renderer are not attached to a
 * frame, after a full garbage collection.
 */
async function countDetachedDocuments(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  try {
    // The console keeps every object logged while a debugger is attached, and
    // Playwright is one
    await cdp.send("Runtime.enable");
    await cdp.send("Runtime.discardConsoleEntries");
    for (let i = 0; i < 3; i++) {
      await cdp.send("HeapProfiler.collectGarbage");
    }
    const { documents } = await cdp.send("Memory.getDOMCounters");
    // Cross-site frames live in other renderers, so this can be negative;
    // only the change matters
    return documents - page.frames().length;
  } finally {
    await cdp.detach();
  }
}

/** Returns a handle to the ViewCtx of the current arena's first frame. */
async function getFirstFrameViewCtx(studio: Frame) {
  return studio.evaluateHandle(() => {
    const sc = (window as any).dbg.studioCtx;
    return sc.tryGetViewCtxForFrame(
      sc.currentArena.matrix.rows[0].cols[0].frame,
    );
  });
}

/**
 * Selects the root element of the current arena's component in its first
 * frame, and checks that this records a view snapshot with the element's
 * ValNode in the undo log.
 */
async function selectRootIntoUndoRecord(studio: Frame) {
  const vc = await getFirstFrameViewCtx(studio);
  await studio.evaluate(async (vc_: any) => {
    await vc_.studioCtx.changeUnsafe(() =>
      vc_.setStudioFocusByTpl(vc_.arenaFrame().container.component.tplTree),
    );
  }, vc);
  // A handle keeps its object alive
  await vc.dispose();
  expect(
    await studio.evaluate(() => {
      const sc = (window as any).dbg.studioCtx;
      const { view } = sc.undoLog.head();
      return (
        view.focusedSelectable?.fullKey &&
        view.focusedSelectable.tpl === sc.currentArena.component.tplTree
      );
    }),
  ).toBe(true);
}

test.describe("canvas frames", () => {
  let projectId: string;

  test.beforeEach(async ({ apiClient, page }) => {
    projectId = await apiClient.setupNewProject({ name: "canvas-frame-leak" });
    await setE2eDevFlags(page, { liveArenas: LIVE_ARENAS });
    await goToProject(page, `/projects/${projectId}`);
  });

  test.afterEach(async ({ apiClient }) => {
    await apiClient.removeProjectAfterTest(
      projectId,
      "user2@example.com",
      "!53kr3tz!",
    );
  });

  test("frees the frames of evicted arenas", async ({ page, models }) => {
    const studio = await getStudioWindowFrame(page);
    await studio.evaluate(async (numComponents) => {
      const sc = (window as any).dbg.studioCtx;
      await sc.changeUnsafe(() => {
        for (let i = 0; i < numComponents; i++) {
          sc.tplMgr().addComponent({ type: "plain", name: `LeakTest${i}` });
        }
      });
    }, NUM_COMPONENTS);
    // Warm up first: the first selection lazily creates a document that
    // isn't attached to any frame (and stays, no matter how many frames come
    // and go), which would otherwise count as a leak
    await models.studio.switchToComponentArena("LeakTest0");
    await selectRootIntoUndoRecord(studio);
    const detachedBefore = await countDetachedDocuments(page);

    for (let i = 1; i < NUM_COMPONENTS; i++) {
      await models.studio.switchToComponentArena(`LeakTest${i}`);
      // Undo records hold on to what was selected, and must not keep the
      // frame alive through it
      await selectRootIntoUndoRecord(studio);
    }

    // Disposed frames are freed: no more documents than before are left
    // without a frame
    expect(await countDetachedDocuments(page)).toBeLessThanOrEqual(
      detachedBefore,
    );

    // Undo back to a selection in an evicted arena, which recreates its
    // frames. The undo record's ValNode was detached from the old frame, and
    // is filled in again by the new render.
    const evictedIndex = NUM_COMPONENTS - LIVE_ARENAS - 1;
    const evictedName = `LeakTest${evictedIndex}`;
    const undoRecordVal = await studio.evaluateHandle((componentName) => {
      const sc = (window as any).dbg.studioCtx;
      const { tplTree } = sc.site.components.find(
        (c: any) => c.name === componentName,
      );
      return sc.undoLog._log.find(
        (r: any) => r.view.focusedSelectable?.tpl === tplTree,
      ).view.focusedSelectable;
    }, evictedName);
    const detached = await studio.evaluate(async (val: any) => {
      const sc = (window as any).dbg.studioCtx;
      const valState = { fibers: val.fibers.length, env: val.env };
      for (let i = 0; i < 100; i++) {
        if (sc.currentArena?.component.tplTree === val.tpl) {
          return valState;
        }
        if (!sc.canUndo()) {
          throw new Error("Ran out of undo records");
        }
        await sc.undo();
      }
      throw new Error("Never got back to the evicted arena");
    }, undoRecordVal);
    expect(detached).toEqual({ fibers: 0, env: undefined });
    await waitForArenaFrames(page, studio);
    const vc = await getFirstFrameViewCtx(studio);
    // The undo record's ValNode is the new render's ValNode again
    await studio.waitForFunction(
      ([val, vc_]) =>
        val.fibers.length > 0 &&
        !!val.env &&
        val === vc_.renderState.tpl2bestVal(val.tpl),
      [undoRecordVal, vc],
    );
    await undoRecordVal.dispose();
    await vc.dispose();

    // The arena evicted by the undo is freed too
    expect(await countDetachedDocuments(page)).toBeLessThanOrEqual(
      detachedBefore,
    );
  });
});
