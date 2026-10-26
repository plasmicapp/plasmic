import { isExpectedApiError } from "@/wab/client/observability/expected-errors";
import {
  AuthError,
  BadRequestError,
  BundleTypeError,
  CopilotPlanRequiredError,
  CopilotRateLimitExceededError,
  ForbiddenError,
  NotFoundError,
  PreconditionFailedError,
  ProjectRevisionError,
  SchemaMismatchError,
  UnauthorizedError,
  transformErrors,
} from "@/wab/shared/ApiErrors/errors";
import { UserError } from "@/wab/shared/UserError";

describe("isExpectedApiError", () => {
  it("is true for expected server 4xx errors", () => {
    for (const err of [
      new UnauthorizedError("x"),
      new ForbiddenError("x"),
      new AuthError("x"),
      new NotFoundError("x"),
      new PreconditionFailedError("x"),
      new CopilotRateLimitExceededError("x"),
      new CopilotPlanRequiredError(),
    ]) {
      expect(isExpectedApiError(err)).toBe(true);
    }
  });

  it("is true for errors rehydrated from a server response", () => {
    for (const name of [
      "ForbiddenError",
      "NotFoundError",
      "EntityNotFound",
      "PreconditionFailedError",
    ]) {
      expect(
        isExpectedApiError(transformErrors({ name, message: "x" } as Error)),
      ).toBe(true);
    }
  });

  it("is false for errors that may signal a bug", () => {
    for (const err of [
      new BadRequestError("x"),
      new ProjectRevisionError("x"),
      new SchemaMismatchError("x"),
      new BundleTypeError("x"),
      new UserError("x", "y"),
      new Error("x"),
      "x",
      undefined,
    ]) {
      expect(isExpectedApiError(err)).toBe(false);
    }
  });
});
