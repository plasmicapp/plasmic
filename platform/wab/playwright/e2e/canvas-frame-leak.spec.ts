import { expect, Page } from "@playwright/test";
import { test } from "../fixtures/test";
import {
  getStudioWindowFrame,
  goToProject,
  setE2eDevFlags,
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

  test("frees the frames of evicted arenas", async ({ page }) => {
    const studio = await getStudioWindowFrame(page);
    await studio.evaluate(async (numComponents) => {
      const sc = (window as any).dbg.studioCtx;
      await sc.changeUnsafe(() => {
        for (let i = 0; i < numComponents; i++) {
          sc.tplMgr().addComponent({ type: "plain", name: `LeakTest${i}` });
        }
      });
    }, NUM_COMPONENTS);
    const detachedBefore = await countDetachedDocuments(page);

    for (let i = 0; i < NUM_COMPONENTS; i++) {
      await studio.evaluate(async (name) => {
        const sc = (window as any).dbg.studioCtx;
        const component = sc.site.components.find((c: any) => c.name === name);
        await sc.changeUnsafe(() => sc.switchToComponentArena(component));
      }, `LeakTest${i}`);
      // Wait for every frame of the arena to render
      await studio.waitForFunction(() => {
        const sc = (window as any).dbg.studioCtx;
        const arena = sc.currentArena;
        const frames = [arena.matrix, arena.customMatrix]
          .filter(Boolean)
          .flatMap((m: any) => m.rows.flatMap((r: any) => r.cols))
          .map((cell: any) => cell.frame);
        return (
          frames.length > 0 &&
          frames.every(
            (frame: any) =>
              sc.tryGetViewCtxForFrame(frame)?.csEvaluator?.renderCount > 0,
          )
        );
      });
    }

    // Disposed frames are freed: no more documents than before are left
    // without a frame
    expect(await countDetachedDocuments(page)).toBeLessThanOrEqual(
      detachedBefore,
    );
  });
});
