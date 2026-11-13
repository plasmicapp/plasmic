import { mapCreateRepoError } from "@/wab/server/github/util";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";

function mkHttpError(
  status: number,
  message: string,
  errors?: { message?: string }[],
  headers: Record<string, string> = {},
) {
  return Object.assign(new Error(message), {
    name: "HttpError",
    status,
    response: { data: { message, errors }, headers },
  });
}

describe("mapCreateRepoError", () => {
  it("maps 'name already exists' to a known error", () => {
    expect(
      mapCreateRepoError(
        mkHttpError(422, "Repository creation failed.", [
          { message: "name already exists on this account" },
        ]),
      ),
    ).toBe("repo exists");
  });

  it("still reads top-level errors", () => {
    expect(
      mapCreateRepoError(
        Object.assign(new Error("Repository creation failed."), {
          errors: [{ message: "name already exists on this account" }],
        }),
      ),
    ).toBe("repo exists");
  });

  it.each([403, 422])(
    "maps GitHub %s permission errors to a bad request",
    (status) => {
      const result = mapCreateRepoError(
        mkHttpError(status, "You need admin access to the organization"),
      );
      expect(result).toBeInstanceOf(BadRequestError);
      expect((result as Error).message).toBe(
        "You need admin access to the organization",
      );
    },
  );

  it.each([
    mkHttpError(403, "You have exceeded a secondary rate limit"),
    mkHttpError(403, "Forbidden", undefined, { "x-ratelimit-remaining": "0" }),
    mkHttpError(403, "Forbidden", undefined, { "retry-after": "60" }),
    mkHttpError(429, "Too many requests"),
    mkHttpError(502, "Bad gateway"),
    new Error("socket hang up"),
  ])("preserves rate limits and unexpected errors: %s", (error) => {
    expect(mapCreateRepoError(error)).toBe(error);
  });
});
