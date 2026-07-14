import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { asyncTimeout, withoutNils } from "@/wab/shared/common";
import type { CanvasEnv } from "@/wab/shared/eval";
import type { TplNode } from "@/wab/shared/model/classes";
import { isPlasmicUndefinedDataErrorPromise } from "@plasmicapp/data-sources";

export interface SettleOpts {
  /** Overall deadline for all query settlement. */
  timeoutMs?: number;
}

const DEFAULT_SETTLE_TIMEOUT_MS = 5000;

/**
 * A `$q` entry is a StatefulQueryResult. Returns a promise that resolves once the
 * query settles, or undefined if it is already settled (done or errored).
 * Duck-type instead of instanceof because the instance comes from the canvas iframe.
 */
function getPendingServerQueryPromise(q: any): Promise<unknown> | undefined {
  if (!q || typeof q !== "object" || typeof q.getDoneResult !== "function") {
    return undefined;
  }
  return q.isLoading ? q.getDoneResult().catch(() => undefined) : undefined;
}

/**
 * A `$queries` entry is a ClientQueryResult. While loading/blocked, `data` is
 * a proxy that throws the fetch promise when accessed (or kicks it off).
 * Returns that promise, or undefined if the query is already settled.
 */
function getPendingDataQueryPromise(q: any): Promise<unknown> | undefined {
  if (!q || typeof q !== "object") {
    return undefined;
  }
  try {
    void q.data?.__plasmicSettleProbe;
  } catch (thrown) {
    if (isPlasmicUndefinedDataErrorPromise(thrown)) {
      return thrown.catch(() => undefined);
    }
  }
  return undefined;
}

function bagValues(bag: unknown): unknown[] {
  return bag && typeof bag === "object" ? Object.values(bag) : [];
}

function collectPendingQueryPromises(env: CanvasEnv): Promise<unknown>[] {
  return withoutNils([
    ...bagValues(env.$q).map(getPendingServerQueryPromise),
    ...bagValues(env.$queries).map(getPendingDataQueryPromise),
  ]);
}

/**
 * Waits for `viewCtx` to finish rendering and its queries to settle, then returns
 * the canvas env for `tpl`, or undefined if the subtree above `tpl` isn't in the
 * val tree (the component didn't render a root val; a render error is caught by the
 * canvas error boundary and leaves none), or the val tree wasn't ready yet when we
 * returned after a sync timeout.
 *
 * Queries are awaited in waves, each wave awaits all query promises in the env, then
 * lets the canvas re-render (to start dependent queries), until all are settled.
 */
export async function waitForCanvasEnvSettled(
  viewCtx: ViewCtx,
  tpl: TplNode,
  opts: SettleOpts = {}
): Promise<CanvasEnv | undefined> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_SETTLE_TIMEOUT_MS;
  const deadline = performance.now() + timeoutMs;
  const timeLeft = () => deadline - performance.now();
  const withDeadline = <T>(p: Promise<T>) =>
    Promise.race([p, asyncTimeout(timeLeft()).then(() => "timeout" as const)]);

  // Wait for the val tree to exist and the sync queue to go idle.
  if (viewCtx.isStale()) {
    if ((await withDeadline(viewCtx.awaitSync())) === "timeout") {
      return viewCtx.getCanvasEnvForTpl(tpl);
    }
  }

  while (timeLeft() > 0) {
    // Re-fetch the env each wave: $queries entries are rebuilt per render,
    // so references held across renders go stale.
    const env = viewCtx.getCanvasEnvForTpl(tpl);
    if (!env) {
      return env;
    }
    const pending = collectPendingQueryPromises(env);
    if (pending.length === 0) {
      return env;
    }
    if ((await withDeadline(Promise.all(pending))) === "timeout") {
      break;
    }
    // Dependent $queries get their key on the next render, wait for the
    // canvas to re-sync before re-checking.
    await withDeadline(viewCtx.awaitSync());
  }
  return viewCtx.getCanvasEnvForTpl(tpl);
}
