import { RateLimitedExceeded } from "@/wab/shared/ApiErrors/errors";

export function isGithubRateLimited(
  error: Error & {
    status?: number;
    response?: { headers?: Record<string, string | undefined> };
  },
): boolean {
  return (
    (error.status === 403 || error.status === 429) &&
    (error.status === 429 ||
      error.response?.headers?.["x-ratelimit-remaining"] === "0" ||
      error.response?.headers?.["retry-after"] !== undefined ||
      /rate limit/i.test(error.message))
  );
}

export function throwIfGithubRateLimited(
  error: Parameters<typeof isGithubRateLimited>[0],
): void {
  if (isGithubRateLimited(error)) {
    throw new RateLimitedExceeded(
      "GitHub API rate limit exceeded. Please try again later.",
      { cause: error },
    );
  }
}
