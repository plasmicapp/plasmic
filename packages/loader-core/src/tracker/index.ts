import unfetch from "@plasmicapp/isomorphic-unfetch";
import {
  getDistinctId,
  getEnvMeta,
  getVariationCookieValues,
  getWindowMeta,
  rawSplitVariation,
  throttled,
} from "./utils";

export interface TrackerOptions {
  projectIds: string[];
  host?: string;
  platform?: string;
  preview?: boolean;
  nativeFetch?: boolean;
}

type EventType = "$render" | "$fetch" | "$conversion";

interface Event {
  event: EventType;
  properties: Record<string, any>;
}

export interface TrackerRenderProperties {
  rootProjectId?: string;
  rootComponentId?: string;
  rootComponentName?: string;
  teamIds: string[];
  projectIds: string[];
}

export interface TrackRenderOptions {
  renderCtx?: TrackerRenderProperties;
  variation?: Record<string, string>;
}

const API_ENDPOINT = "https://analytics.plasmic.app/capture";
const API_PUBLIC_KEY = "phc_BRvYTAoMoam9fDHfrIneF67KdtMJagLVVCM6ELNYd4n";
const TRACKER_VERSION = 4;

export class PlasmicTracker {
  private eventQueue: Event[] = [];
  private fetch: typeof globalThis.fetch;

  constructor(private opts: TrackerOptions) {
    this.fetch = (
      opts.nativeFetch && globalThis.fetch ? globalThis.fetch : unfetch
    ).bind(globalThis);
  }

  public trackRender(opts?: TrackRenderOptions) {
    this.enqueue({
      event: "$render",
      properties: {
        ...this.getProperties(),
        ...(opts?.renderCtx ?? {}),
        ...rawSplitVariation(opts?.variation ?? {}),
      },
    });
  }

  public trackFetch() {
    this.enqueue({
      event: "$fetch",
      properties: this.getProperties(),
    });
  }

  public trackConversion(value: number = 0) {
    this.enqueue({
      event: "$conversion",
      properties: {
        ...this.getProperties(),
        value,
      },
    });
  }

  private getProperties() {
    return {
      distinct_id: getDistinctId(),
      ...getWindowMeta(),
      ...getEnvMeta(),
      ...this.getContextMeta(),
      ...getVariationCookieValues(),
      timestamp: Date.now() ?? +new Date(),
      trackerVersion: TRACKER_VERSION,
    };
  }

  private enqueue(event: Event) {
    this.eventQueue.push(event);

    this.sendEvents("fetch");
  }

  private getContextMeta() {
    return {
      platform: this.opts.platform,
      preview: this.opts.preview,
      projectIds: this.opts.projectIds,
    };
  }

  private sendEvents = throttled(async (transport: "fetch" | "beacon") => {
    if (this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue.length = 0;

    const body = {
      api_key: API_PUBLIC_KEY,
      batch: events,
    };

    try {
      const stringBody = JSON.stringify(body);
      if (transport === "beacon") {
        // Triggers warning: https://chromestatus.com/feature/5629709824032768
        window.navigator.sendBeacon(API_ENDPOINT, stringBody);
      } else {
        this.fetch(API_ENDPOINT, {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          body: stringBody,
        })
          .then(() => {})
          .catch(() => {});
      }
    } catch (err) {}
  });
}
