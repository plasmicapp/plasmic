import { previewLoaderCacheCounter } from "@/wab/server/promstats";

export type PreviewBundleSource = "cache" | "joined" | "computed";

interface CachedBody {
  body: Buffer;
  expiresAt: number;
}

/**
 * Per-process dedupe for preview loader bundles. A preview build of a large
 * project can use several GiB across the codegen workers and esbuild, so the
 * process must not run the same build twice or overlap builds of one project.
 *
 * - `key` identifies one output (project revisions + options). Requests with
 *   the same key share one build, and reuse the result until `ttlMs` ends.
 * - `lane` groups keys that must not build at the same time (same projects +
 *   options, any revision). Builds in one lane run one after another.
 */
export class PreviewBundleCache {
  private readonly inFlight = new Map<string, Promise<Buffer>>();
  private readonly laneTails = new Map<string, Promise<unknown>>();
  // Map keeps insertion order, so the first entry is the oldest.
  private readonly done = new Map<string, CachedBody>();
  private size = 0;

  constructor(
    private readonly opts: {
      maxBytes: number;
      now?: () => number;
    },
  ) {}

  async get(args: {
    lane: string;
    key: string;
    ttlMs: number;
    getTtlAfterBuild?: () => Promise<number>;
    skipFinished?: boolean;
    compute: () => Promise<unknown>;
  }): Promise<{ body: Buffer; source: PreviewBundleSource }> {
    const { lane, key, ttlMs, compute } = args;

    if (ttlMs <= 0) {
      this.done.clear();
      this.size = 0;
    }
    const cached = this.done.get(key);
    if (cached) {
      if (!args.skipFinished && cached.expiresAt > this.now()) {
        return this.count({ body: cached.body, source: "cache" });
      }
      this.delete(key);
    }

    const pending = this.inFlight.get(key);
    if (pending) {
      return this.count({ body: await pending, source: "joined" });
    }

    const prevTail = this.laneTails.get(lane) ?? Promise.resolve();
    const run = prevTail
      // A failed build in the lane must not fail the next one.
      .catch(() => undefined)
      .then(async () => {
        const body = Buffer.from(JSON.stringify(await compute()));
        if (ttlMs > 0 && body.length <= this.opts.maxBytes) {
          const currentTtl = (await args.getTtlAfterBuild?.()) ?? ttlMs;
          if (currentTtl > 0) {
            this.store(key, body, Math.min(ttlMs, currentTtl));
          }
        }
        return body;
      });
    this.inFlight.set(key, run);
    this.laneTails.set(lane, run);

    try {
      return this.count({ body: await run, source: "computed" });
    } finally {
      this.inFlight.delete(key);
      if (this.laneTails.get(lane) === run) {
        this.laneTails.delete(lane);
      }
    }
  }

  private store(key: string, body: Buffer, ttlMs: number) {
    this.delete(key);
    this.evictExpired();
    while (this.size + body.length > this.opts.maxBytes && this.done.size > 0) {
      this.delete(this.done.keys().next().value as string);
    }
    this.done.set(key, { body, expiresAt: this.now() + ttlMs });
    this.size += body.length;
  }

  private evictExpired() {
    const now = this.now();
    for (const [key, entry] of this.done) {
      if (entry.expiresAt <= now) {
        this.delete(key);
      }
    }
  }

  private delete(key: string) {
    const entry = this.done.get(key);
    if (entry) {
      this.size -= entry.body.length;
      this.done.delete(key);
    }
  }

  private now() {
    return this.opts.now?.() ?? Date.now();
  }

  private count<T extends { source: PreviewBundleSource }>(result: T): T {
    previewLoaderCacheCounter.inc({ result: result.source });
    return result;
  }
}
