import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initPlasmicLoaderWithCache } from "./cache";

const socket = new EventEmitter();
const mocks = vi.hoisted(() => ({
  setPreviewMinRev: vi.fn(),
  unlink: vi.fn(async () => {}),
}));

vi.mock("socket.io-client", () => ({ default: () => socket }));

vi.mock("@plasmicapp/loader-core", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  internal_setPreviewMinRev: mocks.setPreviewMinRev,
}));

vi.mock("./server-require", () => ({
  serverRequire: async (module: string) => {
    if (module === "@plasmicapp/watcher") {
      return import("../../watcher/src/watcher");
    }
    throw new Error(`Unexpected serverRequire(${module})`);
  },
  serverRequireFs: async () => ({
    promises: {
      mkdir: async () => {},
      readFile: async () => {
        throw new Error("no cache");
      },
      writeFile: async () => {},
      unlink: mocks.unlink,
    },
  }),
}));

async function initWithWatcher(preview: boolean) {
  const loader = { clearCache: vi.fn() };
  initPlasmicLoaderWithCache(() => loader, {
    projects: [{ id: "projA", token: "tokenA" }],
    preview,
  });
  await vi.waitFor(() => expect(socket.listenerCount("update")).toBe(1));
  return loader;
}

describe("initPlasmicLoaderWithCache watcher", () => {
  beforeEach(() => {
    delete process.env.PLASMIC_WATCHED;
    delete process.env.PLASMIC_OPTS;
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    socket.removeAllListeners();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    delete process.env.PLASMIC_WATCHED;
    delete process.env.PLASMIC_OPTS;
  });

  it("records the revision hint before invalidating the preview cache", async () => {
    const loader = await initWithWatcher(true);

    socket.emit("update", { projectId: "projA", rev: { revision: 42 } });

    expect(mocks.setPreviewMinRev).toHaveBeenCalledWith("projA", 42);
    expect(loader.clearCache).toHaveBeenCalledTimes(1);
    // The file cache clears asynchronously.
    await vi.waitFor(() => expect(mocks.unlink).toHaveBeenCalledTimes(1));
    const hintOrder = mocks.setPreviewMinRev.mock.invocationCallOrder[0];
    expect(hintOrder).toBeLessThan(
      loader.clearCache.mock.invocationCallOrder[0],
    );
    expect(hintOrder).toBeLessThan(mocks.unlink.mock.invocationCallOrder[0]);

    // Publishing doesn't affect a preview loader.
    socket.emit("publish", { projectId: "projA", version: "1.0.0" });
    expect(loader.clearCache).toHaveBeenCalledTimes(1);
  });

  it("leaves published invalidation unchanged", async () => {
    const loader = await initWithWatcher(false);

    socket.emit("update", { projectId: "projA", rev: { revision: 42 } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(loader.clearCache).not.toHaveBeenCalled();
    expect(mocks.unlink).not.toHaveBeenCalled();

    socket.emit("publish", { projectId: "projA", version: "1.0.0" });
    expect(loader.clearCache).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(mocks.unlink).toHaveBeenCalledTimes(1));
    expect(mocks.setPreviewMinRev).not.toHaveBeenCalled();
  });
});
