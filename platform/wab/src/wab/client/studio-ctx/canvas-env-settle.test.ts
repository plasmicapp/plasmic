import { waitForCanvasEnvSettled } from "@/wab/client/studio-ctx/canvas-env-settle";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { asyncTimeout } from "@/wab/shared/common";
import { StatefulQueryResult } from "@/wab/shared/core/custom-functions";
import type { CanvasEnv } from "@/wab/shared/eval";
import type { TplNode } from "@/wab/shared/model/classes";

const tpl = {} as TplNode;

// Settled tests should finish quickly. If settling breaks, the helper stalls
// until this deadline, and jest's timeout fails the test first.
const LONG_TIMEOUT = { timeoutMs: 60000 };

function mkEnv(partial: Partial<CanvasEnv>): CanvasEnv {
  return {
    $ctx: {},
    $props: {},
    $state: {},
    $queries: {},
    $q: {},
    ...partial,
  } as CanvasEnv;
}

function fakeViewCtx(envProvider: () => CanvasEnv | undefined): ViewCtx {
  return {
    isStale: () => false,
    awaitSync: async () => undefined,
    getCanvasEnvForTpl: () => envProvider(),
  } as unknown as ViewCtx;
}

describe("waitForCanvasEnvSettled", () => {
  it("returns immediately when no queries are pending", async () => {
    const env = mkEnv({
      $queries: { users: { data: [1], isLoading: false, error: null } },
    });
    const result = await waitForCanvasEnvSettled(
      fakeViewCtx(() => env),
      tpl,
      LONG_TIMEOUT
    );
    expect(result).toBe(env);
  });

  it("waits for a loading $q StatefulQueryResult to resolve", async () => {
    const q = new StatefulQueryResult();
    const vc = fakeViewCtx(() => mkEnv({ $q: { products: q } }));
    let settled = false;
    const resultPromise = waitForCanvasEnvSettled(vc, tpl, LONG_TIMEOUT).then(
      (env) => {
        settled = true;
        return env;
      }
    );
    await asyncTimeout(20);
    expect(settled).toBe(false);
    q.resolvePromise("k", [{ id: 7, name: "Gadget" }]);
    const env = await resultPromise;
    expect((env?.$q.products as StatefulQueryResult).isLoading).toBe(false);
    expect((env?.$q.products as StatefulQueryResult).data).toEqual([
      { id: 7, name: "Gadget" },
    ]);
  });

  it("waits on the thrown undefined-data promise of a loading $queries entry", async () => {
    let resolveFetch!: (v: unknown) => void;
    const fetchPromise = new Promise((res) => (resolveFetch = res));
    (fetchPromise as any).plasmicType = "PlasmicUndefinedDataError";
    let loading = true;
    const query = {
      get data() {
        if (loading) {
          throw fetchPromise;
        }
        return [{ id: 1 }];
      },
      isLoading: true,
    };
    const vc = fakeViewCtx(() => mkEnv({ $queries: { users: query } }));
    let settled = false;
    const resultPromise = waitForCanvasEnvSettled(vc, tpl, LONG_TIMEOUT).then(
      (env) => {
        settled = true;
        return env;
      }
    );
    await asyncTimeout(20);
    expect(settled).toBe(false);
    loading = false;
    resolveFetch(undefined);
    const env = await resultPromise;
    expect(env?.$queries.users.data).toEqual([{ id: 1 }]);
  });

  it("waits in waves for dependent queries that start after the first settles", async () => {
    const first = new StatefulQueryResult();
    const second = new StatefulQueryResult();
    // The dependent query only appears in the env once the first one is done, like a
    // $q entry whose args can only be evaluated after upstream data arrives.
    const vc = fakeViewCtx(() =>
      mkEnv({
        $q: first.isLoading ? { first } : { first, second },
      })
    );
    let settled = false;
    const resultPromise = waitForCanvasEnvSettled(vc, tpl, LONG_TIMEOUT).then(
      (env) => {
        settled = true;
        return env;
      }
    );
    first.resolvePromise("k1", "one");
    await asyncTimeout(20);
    expect(settled).toBe(false);
    second.resolvePromise("k2", "two");
    const env = await resultPromise;
    expect((env?.$q.second as StatefulQueryResult).data).toBe("two");
  });

  it("treats a rejected query as settled", async () => {
    const q = new StatefulQueryResult();
    const vc = fakeViewCtx(() => mkEnv({ $q: { broken: q } }));
    const resultPromise = waitForCanvasEnvSettled(vc, tpl, LONG_TIMEOUT);
    q.rejectPromise("k", new Error("boom"));
    const env = await resultPromise;
    expect((env?.$q.broken as StatefulQueryResult).isLoading).toBe(false);
    expect(() => (env?.$q.broken as StatefulQueryResult).data).toThrow("boom");
  });

  it("returns the partial env when a query never settles within the deadline", async () => {
    const q = new StatefulQueryResult();
    const vc = fakeViewCtx(() => mkEnv({ $q: { stuck: q } }));
    const env = await waitForCanvasEnvSettled(vc, tpl, { timeoutMs: 100 });
    expect((env?.$q.stuck as StatefulQueryResult).isLoading).toBe(true);
  });

  it("awaits a stale ViewCtx's sync before reading the env", async () => {
    let stale = true;
    const env = mkEnv({});
    const vc = {
      isStale: () => stale,
      awaitSync: async () => {
        stale = false;
      },
      getCanvasEnvForTpl: () => (stale ? undefined : env),
    } as unknown as ViewCtx;
    const result = await waitForCanvasEnvSettled(vc, tpl, LONG_TIMEOUT);
    expect(result).toBe(env);
  });
});
