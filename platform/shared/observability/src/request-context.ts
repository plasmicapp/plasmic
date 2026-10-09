import { randomUUID } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import type { Properties } from "./Properties";

const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]{1,128}$/;

function requestIdFromHeader(value: string | string[] | undefined | null) {
  const requestId = typeof value === "string" ? value.trim() : "";
  return REQUEST_ID_PATTERN.test(requestId) ? requestId : randomUUID();
}

type WithLogContext = <T>(properties: Properties, fn: () => T) => T;

export function expressRequestContextMiddleware(
  withLogContext: WithLogContext,
) {
  return (
    req: {
      id?: string;
      headers: IncomingHttpHeaders;
      method: string;
      path: string;
    },
    _res: unknown,
    next: () => void,
  ) => {
    const requestId = requestIdFromHeader(req.headers[REQUEST_ID_HEADER]);
    req.id = requestId;
    req.headers[REQUEST_ID_HEADER] = requestId;
    return withLogContext(
      { requestId, requestMethod: req.method, requestPath: req.path },
      next,
    );
  };
}

export function honoRequestContextMiddleware(withLogContext: WithLogContext) {
  return (
    ctx: { req: { raw: Request; method: string; path: string } },
    next: () => Promise<void>,
  ) => {
    const headers = ctx.req.raw.headers;
    const requestId = requestIdFromHeader(headers.get(REQUEST_ID_HEADER));
    headers.set(REQUEST_ID_HEADER, requestId);
    return withLogContext(
      { requestId, requestMethod: ctx.req.method, requestPath: ctx.req.path },
      next,
    );
  };
}
