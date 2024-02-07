import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import { ZapierDataSource } from "@/wab/shared/data-sources-meta/zapier-meta";
import fetch from "node-fetch";

export function makeZapierFetcher(source: ZapierDataSource) {
  return new ZapierFetcher(source);
}

export class ZapierFetcher {
  constructor(private source: ZapierDataSource) {}

  async trigger(opts: { body?: any; search?: Record<string, any> }) {
    const res = await fetch(
      this.makePath(this.source.settings.hookUrl, opts.search),
      {
        method: "POST",
        body:
          opts.body === undefined
            ? undefined
            : typeof opts.body === "object"
            ? JSON.stringify(opts.body)
            : opts.body,
      }
    );
    return await res.json();
  }

  private makePath(path: string, search?: Record<string, any>) {
    let url: URL;
    try {
      url = new URL(path);
    } catch {
      throw new BadRequestError(`Unexpected hook URL to be ${path}`);
    }
    if (!url.href.startsWith("https://hooks.zapier.com/hooks/catch/")) {
      throw new BadRequestError(`Unexpected hook URL to be ${path}`);
    }
    if (search) {
      let searchParams: URLSearchParams;
      try {
        searchParams = new URLSearchParams(search);
      } catch {
        throw new BadRequestError(
          `Unexpected valid URLSearchParams, but got: ${search}`
        );
      }
      Array.from(searchParams.entries()).forEach(([k, v]) => {
        url.searchParams.append(k, v);
      });
    }
    return url.toString();
  }
}
