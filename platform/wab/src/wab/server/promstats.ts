import { MIGRATION_POOL_NAME } from "@/wab/server/db/DbCon";
import { Request, Response } from "express-serve-static-core";
import { Gauge, Histogram } from "prom-client";
import { getConnection } from "typeorm";

export const DEFAULT_HISTOGRAM_BUCKETS = [
  0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 20, 30, 60, 90, 120, 150, 180,
];

const liveRequests = new Gauge({
  name: "http_request_live",
  help: "Number of live requests being served",
  labelNames: ["path", "app", "url"],
});

const recentRequestTags: Record<string, number> = {};

export class WabPromLiveRequestsGauge {
  constructor(private name: string) {}

  onReqStart(request: Request) {
    request.startTime = process.hrtime.bigint();
    liveRequests.inc(this.getReqTags(request), 1);
  }

  onReqEnd(request: Request, response: Response) {
    const tags = this.getReqTags(request);
    liveRequests.dec(tags, 1);

    recentRequestTags[JSON.stringify(tags)] = new Date().getTime();

    this.cleanupObsoleteTags();
  }

  private cleanupObsoleteTags() {
    // Clean up all tags that are older than 1 minute, if their gauge is
    // 0. This is so we avoid tracking metrics forever, even long after
    // request is no longer live. We really only want a snapshot of the
    // requests that are currently live! This is expensive to track
    // because url is one of the tags, and that has very high dimensionality.
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

  private getReqTags(request: Request) {
    return { path: request.path, app: this.name, url: request.originalUrl };
  }
}

const taskDuration = new Histogram({
  name: "task_duration",
  help: "How long something took",
  labelNames: ["task"],
  buckets: DEFAULT_HISTOGRAM_BUCKETS,
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
