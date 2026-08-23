import { HostHistory } from "@/wab/client/frame-ctx/host-frame-ctx";
import { TopFrameFullApi } from "@/wab/client/frame-ctx/top-frame-api";
import { PromisifyMethods } from "@/wab/commons/promisify-methods";
import { Action, Listener, Location } from "history";

function mkWireLocation(path: string, key: string | undefined): Location {
  const url = new URL(path, "http://fake-url");
  return {
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    state: null,
    key: key ?? "",
  };
}

function createFakeTopFrameApi() {
  let wireListener: Listener | undefined;
  const unregister = vitest.fn();
  const pushLocation = vitest.fn();
  const replaceLocation = vitest.fn();
  const api = {
    registerLocationListener: async (listener: Listener) => {
      wireListener = listener;
      return unregister;
    },
    pushLocation: async (path?: string, query?: string, hash?: string) => {
      pushLocation(path, query, hash);
    },
    replaceLocation: async (path?: string, query?: string, hash?: string) => {
      replaceLocation(path, query, hash);
    },
  } as unknown as PromisifyMethods<TopFrameFullApi>;
  return {
    api,
    /** Simulates the top frame sending a location wire event. */
    sendLocation(path: string, action: `${Action}`, key?: string) {
      expect(wireListener).toBeTruthy();
      wireListener!({
        location: mkWireLocation(path, key),
        action: action as Action,
      });
    },
    unregister,
    pushLocation,
    replaceLocation,
  };
}

/** Creates a HostHistory and delivers the initial location, like the real
 * top frame does immediately upon listener registration. */
function createHostHistory(
  fake: ReturnType<typeof createFakeTopFrameApi>,
  initialPath = "/a"
): { history: HostHistory; dispose: () => Promise<void> } {
  const history = new HostHistory(fake.api);
  fake.sendLocation(initialPath, "REPLACE", "k0");
  return { history, dispose: history.dispose };
}

describe("HostHistory", () => {
  it("starts at the initial location sent by the top frame", () => {
    const fake = createFakeTopFrameApi();
    const { history } = createHostHistory(
      fake,
      "/projects/PROJECT_ID?branch=main#h"
    );
    expect(history.location.pathname).toBe("/projects/PROJECT_ID");
    expect(history.location.search).toBe("?branch=main");
    expect(history.location.hash).toBe("#h");
  });

  it("applies PUSH wire events and notifies listeners with PUSH", () => {
    const fake = createFakeTopFrameApi();
    const { history } = createHostHistory(fake);

    const listener = vitest.fn();
    const unlisten = history.listen(listener);
    fake.sendLocation("/b?q=1", "PUSH", "k1");

    expect(history.location.pathname).toBe("/b");
    expect(history.location.search).toBe("?q=1");
    expect(listener).toHaveBeenCalledTimes(1);
    const [{ location, action }] = listener.mock.calls[0];
    expect(location.pathname).toBe("/b");
    expect(action).toBe("PUSH");

    unlisten();
    fake.sendLocation("/c", "PUSH", "k2");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("applies REPLACE wire events and notifies listeners with REPLACE", () => {
    const fake = createFakeTopFrameApi();
    const { history } = createHostHistory(fake);

    const listener = vitest.fn();
    history.listen(listener);
    fake.sendLocation("/a?tab=2", "REPLACE", "k1");

    expect(history.location.pathname).toBe("/a");
    expect(history.location.search).toBe("?tab=2");
    const [{ action }] = listener.mock.calls[0];
    expect(action).toBe("REPLACE");
  });

  it("applies POP wire events (browser back/forward in the top frame)", () => {
    const fake = createFakeTopFrameApi();
    const { history } = createHostHistory(fake);
    fake.sendLocation("/b", "PUSH", "k1");
    fake.sendLocation("/c", "PUSH", "k2");

    const listener = vitest.fn();
    history.listen(listener);

    // Browser back from /c to /b.
    fake.sendLocation("/b", "POP", "k1");
    expect(history.location.pathname).toBe("/b");
    const [{ action }] = listener.mock.calls[0];
    expect(action).toBe("POP");

    // Browser forward from /b to /c.
    fake.sendLocation("/c", "POP", "k2");
    expect(history.location.pathname).toBe("/c");

    // POP outside the host's known history (e.g. entries from before a
    // page refresh) simply jumps to the new location.
    fake.sendLocation("/other", "POP", "unknown-key");
    expect(history.location.pathname).toBe("/other");
  });

  it("does not echo top-frame locations back to the top frame", async () => {
    const fake = createFakeTopFrameApi();
    const { history } = createHostHistory(fake);

    fake.sendLocation("/b?q=1", "PUSH", "k1");
    await Promise.resolve();

    expect(history.location.pathname).toBe("/b");
    expect(fake.pushLocation).not.toHaveBeenCalled();
    expect(fake.replaceLocation).not.toHaveBeenCalled();
  });

  it("forwards push() to the top frame without changing the local location", () => {
    const fake = createFakeTopFrameApi();
    const { history } = createHostHistory(fake);

    history.push("/b?q=1#frag");
    expect(fake.pushLocation).toHaveBeenCalledWith("/b", "?q=1", "#frag");
    // Local location only updates when the top frame echoes the change back.
    expect(history.location.pathname).toBe("/a");

    fake.sendLocation("/b?q=1#frag", "PUSH", "k1");
    expect(history.location.pathname).toBe("/b");
  });

  it("forwards push() location objects to the top frame", () => {
    const fake = createFakeTopFrameApi();
    const { history } = createHostHistory(fake);

    history.push({ pathname: "/b", search: "?q=1", hash: "#frag" });
    expect(fake.pushLocation).toHaveBeenCalledWith("/b", "?q=1", "#frag");
  });

  it("forwards hash-only location objects without a pathname, which the top frame resolves to the current pathname", () => {
    const fake = createFakeTopFrameApi();
    const { history } = createHostHistory(fake, "/workspaces/WORKSPACE_ID");

    history.push({ hash: "#tab=dataSources" });
    expect(fake.pushLocation).toHaveBeenCalledWith(
      undefined,
      undefined,
      "#tab=dataSources"
    );
  });

  it("forwards replace() to the top frame without changing the local location", () => {
    const fake = createFakeTopFrameApi();
    const { history } = createHostHistory(fake);

    history.replace("/a?tab=2");
    expect(fake.replaceLocation).toHaveBeenCalledWith("/a", "?tab=2", "");
    expect(history.location.search).toBe("");
  });

  it("unregisters the top frame listener on dispose", async () => {
    const fake = createFakeTopFrameApi();
    const { dispose } = createHostHistory(fake);
    await dispose();
    expect(fake.unregister).toHaveBeenCalled();
  });
});
