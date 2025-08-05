import rateLimit, {
  RateLimitRequestHandler,
  ValueDeterminingMiddleware,
} from "express-rate-limit";

export function createRateLimiter({
  windowMs,
  limit,
  message = "Too many requests, please try again later.",
  skip,
}: {
  windowMs: number;
  limit: number;
  message?: string;
  skip?: ValueDeterminingMiddleware<boolean>;
}): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit,
    message,
    handler: (req, res, next, options) => {
      req
        .resolveTransaction()
        .catch(() => {})
        .finally(() => res.status(options.statusCode).send(options.message));
    },
    skip,
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      xForwardedForHeader: false,
      trustProxy: false,
    },
  });
}
