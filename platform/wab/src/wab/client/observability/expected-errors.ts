import {
  AuthError,
  CopilotPlanRequiredError,
  CopilotRateLimitExceededError,
  ForbiddenError,
  NotFoundError,
  PreconditionFailedError,
  UnauthorizedError,
} from "@/wab/shared/ApiErrors/errors";

// Expected server 4xx, not reported to Sentry. Excludes BadRequestError and
// other 412s, which usually mean Studio sent bad input.
const EXPECTED_API_ERRORS = [
  UnauthorizedError,
  ForbiddenError,
  AuthError,
  NotFoundError,
  PreconditionFailedError,
  CopilotRateLimitExceededError,
  CopilotPlanRequiredError,
];

export function isExpectedApiError(err: unknown): boolean {
  return EXPECTED_API_ERRORS.some((cls) => err instanceof cls);
}
