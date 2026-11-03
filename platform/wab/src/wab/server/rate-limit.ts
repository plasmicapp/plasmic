import rateLimit, {
  RateLimitRequestHandler,
  ValueDeterminingMiddleware,
} from "express-rate-limit";
import { Request, Response } from "express-serve-static-core";

interface RateLimiterOptions {
  windowMs: number;
  limit: number | ValueDeterminingMiddleware<number>;
  skip?: ValueDeterminingMiddleware<boolean>;
  keyGenerator?: ValueDeterminingMiddleware<string>;
}

const commonOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    trustProxy: false,
    limit: false, // allow limit: 0 to block
  },
} as const;

export function createRateLimiter({
  windowMs,
  limit,
  message = "Too many requests, please try again later.",
  skip,
  keyGenerator,
}: RateLimiterOptions & {
  message?: string;
}): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit,
    message,
    skip,
    keyGenerator,
    ...commonOptions,
  });
}

/**
 * Like createRateLimiter, but for a handler to await once it has validated
 * the request, so that invalid or unauthorized requests don't use up the
 * quota. Throws `makeError()` once the limit is exceeded.
 */
export function createInlineRateLimiter({
  windowMs,
  limit,
  skip,
  keyGenerator,
  makeError,
}: RateLimiterOptions & {
  makeError: () => Error;
}): (req: Request, res: Response) => Promise<void> {
  const limiter = rateLimit({
    windowMs,
    limit,
    skip,
    keyGenerator,
    handler: (_req, _res, next) => next(makeError()),
    ...commonOptions,
  });
  return (req, res) =>
    new Promise((resolve, reject) => {
      void limiter(req, res, (err?: unknown) =>
        err ? reject(err) : resolve(),
      );
    });
}
