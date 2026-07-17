import { MIGRATION_POOL_NAME } from "@/wab/server/db/DbCon";
import { Request, Response } from "express-serve-static-core";
import { Counter, Gauge, Histogram } from "prom-client";
import { getConnection } from "typeorm";
import type { WorkerPool } from "workerpool";

export const DEFAULT_HISTOGRAM_BUCKETS = [
  0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 20, 30, 60, 90, 120, 150, 180,
];

// Long alphanumeric path segments with a digit are ids (e.g. base58 project ids)
// that url-value-parser's masks don't recognize. Requiring a digit avoids masking
// long camelCase route words.
export const METRICS_PATH_ID_MASK = /^(?=.*\d)[a-zA-Z0-9]{16,}$/;

function normalizeMetricPath(path: string) {
  return path
    .split("/")
    .map((part) => (METRICS_PATH_ID_MASK.test(part) ? "#val" : part))
    .join("/");
}

const liveRequests = new Gauge({
  name: "http_request_live",
  help: "Number of live requests being served",
  labelNames: ["path", "app"],
});

const recentRequestTags: Record<string, number> = {};

export class WabPromLiveRequestsGauge {
  private tags: { path: string; app: string } | undefined;

  constructor(private name: string) {}

  onReqStart(request: Request) {
    request.startTime = process.hrtime.bigint();
    // Compute tags once so inc and dec use the same labels, even if
    // routing middlewares rewrite request.path.
    this.tags = { path: normalizeMetricPath(request.path), app: this.name };
    liveRequests.inc(this.tags, 1);
  }

  onReqEnd(_request: Request, _response: Response) {
    if (!this.tags) {
      return;
    }
    liveRequests.dec(this.tags, 1);

    recentRequestTags[JSON.stringify(this.tags)] = new Date().getTime();

    this.cleanupObsoleteTags();
  }

  private cleanupObsoleteTags() {
    // Clean up all tags that are older than 1 minute, if their gauge is
    // 0. This is so we avoid tracking metrics forever, even long after
    // request is no longer live. We really only want a snapshot of the
    // requests that are currently live!
    // We use a timeout instead of removing it immediately from liveRequests
    // because we want the scraper to have a chance to come and see that the
    // gauge value has dropped to 0.
    const now = new Date().getTime();
    for (const [key, timestamp] of Object.entries(recentRequestTags)) {
      if (now - timestamp >= 60000) {
        const tags = JSON.parse(key);
        if ((liveRequests as any)._getValue(tags) === 0) {
          liveRequests.remove(tags);
          delete recentRequestTags[key];
        }
      }
    }
  }
}

const requestCount = new Counter({
  name: "http_request_count",
  help: "Total number of HTTP requests completed",
  labelNames: ["endpoint", "pod_name", "response_code"],
});

export function incHttpRequestCount(opts: {
  endpoint: string;
  responseCode: number;
}) {
  requestCount.inc({
    endpoint: opts.endpoint,
    response_code: String(opts.responseCode),
  });
}

export function getTemplatedEndpointFromExpressRoutePath(
  routePath: unknown
): string {
  const raw = typeof routePath === "string" ? routePath : routePath?.toString();
  if (!raw) {
    return "unknown";
  }

  // Express params are typically like "/api/v1/project/:projectId".
  // We normalize them to "/api/v1/project/{projectId}" for low-cardinality labels.
  return raw.replace(/\/:([^/]+)/g, "/{$1}");
}

const taskDuration = new Histogram({
  name: "task_duration",
  help: "How long something took",
  labelNames: ["task"],
  buckets: DEFAULT_HISTOGRAM_BUCKETS,
});

export const loaderBundleCacheCounter = new Counter({
  name: "loader_bundle_cache_total",
  help: "Final bundle S3 cache hits and misses by source (prefill vs live)",
  labelNames: ["result", "source"],
});

export const loaderCodegenCacheCounter = new Counter({
  name: "loader_codegen_cache_total",
  help: "Per-project codegen S3 cache hits and misses by source (prefill vs live)",
  labelNames: ["result", "source"],
});

export class WabPromTimer {
  private timer: () => number;
  constructor(task: string) {
    this.timer = taskDuration.startTimer({
      task,
    });
  }

  end() {
    return this.timer();
  }
}

const trackedWorkerPools = new Map<string, WorkerPool>();

/**
 * Exports the pool's pending/active task counts as gauges, collected at scrape time.
 */
export function trackWorkerPool(pool: string, workerPool: WorkerPool) {
  trackedWorkerPools.set(pool, workerPool);
}

new Gauge({
  name: "workerpool_pending_tasks",
  help: "Number of tasks queued in the worker pool, waiting for a worker",
  labelNames: ["pool"],
  collect() {
    for (const [pool, workerPool] of trackedWorkerPools) {
      this.set({ pool }, workerPool.stats().pendingTasks);
    }
  },
});

new Gauge({
  name: "workerpool_active_tasks",
  help: "Number of tasks currently running on worker pool workers",
  labelNames: ["pool"],
  collect() {
    for (const [pool, workerPool] of trackedWorkerPools) {
      this.set({ pool }, workerPool.stats().activeTasks);
    }
  },
});

export function trackPostgresPool(app: string) {
  const pgPoolTotal = new Gauge({
    name: `pg_pool_total`,
    labelNames: ["pool", "app"],
    help: `Number of total connections in client pool`,
    collect() {
      for (const conName of ["default", MIGRATION_POOL_NAME]) {
        const pool = getPgPool(conName);
        this.set({ pool: conName, app }, pool.totalCount);
      }
    },
  });

  const pgPoolIdle = new Gauge({
    name: `pg_pool_idle`,
    labelNames: ["pool", "app"],
    help: `Number of idle connections in client pool`,
    collect() {
      for (const conName of ["default", MIGRATION_POOL_NAME]) {
        const pool = getPgPool(conName);
        this.set({ pool: conName, app }, pool.idleCount);
      }
    },
  });

  const pgWaiting = new Gauge({
    name: `pg_pool_waiting`,
    labelNames: ["pool", "app"],
    help: `Number of waiting requests for client pool`,
    collect() {
      for (const conName of ["default", MIGRATION_POOL_NAME]) {
        const pool = getPgPool(conName);
        this.set({ pool: conName, app }, pool.waitingCount);
      }
    },
  });
}

function getPgPool(conName: string) {
  const con = getConnection(conName);
  return (con.driver as any).master;
}
