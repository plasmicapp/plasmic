import { throwIfGithubRateLimited } from "@/wab/server/github/errors";

it.each([
  [403, "API rate limit exceeded for installation ID 129529755.", {}],
  [403, "You have exceeded a secondary rate limit.", {}],
  [403, "Forbidden", { "x-ratelimit-remaining": "0" }],
  [403, "Forbidden", { "retry-after": "60" }],
  [429, "Too many requests", {}],
])("translates GitHub %s: %s", (status, message, headers) => {
  const error = Object.assign(new Error(message), {
    status,
    response: { headers },
  });
  expect(() => throwIfGithubRateLimited(error)).toThrowError(
    expect.objectContaining({
      name: "RateLimitedExceeded",
      statusCode: 429,
      message: "GitHub API rate limit exceeded. Please try again later.",
      cause: error,
    }),
  );
});

it.each([
  [403, "Resource not accessible by integration"],
  [401, "Bad credentials"],
  [404, "Not Found"],
  [500, "Internal Server Error"],
])("does not translate unrelated GitHub %s errors", (status, message) => {
  expect(() =>
    throwIfGithubRateLimited(Object.assign(new Error(message), { status })),
  ).not.toThrow();
});
