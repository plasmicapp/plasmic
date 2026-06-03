import rateLimit, {
  RateLimitRequestHandler,
  ValueDeterminingMiddleware,
} from "express-rate-limit";

export function createRateLimiter({
  windowMs,
  limit,
  message = "Too many requests, please try again later.",
  skip,
  keyGenerator,
}: {
  windowMs: number;
  limit: number;
  message?: string;
  skip?: ValueDeterminingMiddleware<boolean>;
  keyGenerator?: ValueDeterminingMiddleware<string>;
}): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit,
    message,
    skip,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      xForwardedForHeader: false,
      trustProxy: false,
    },
  });
}
