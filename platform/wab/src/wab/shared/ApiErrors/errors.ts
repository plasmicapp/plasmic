export abstract class ApiError extends Error {
  name = "ApiError";
  statusCode = 400;
}

export class UnauthorizedError extends ApiError {
  name = "UnauthorizedError";
  statusCode = 401;
}

export class ForbiddenError extends ApiError {
  name = "ForbiddenError";
  statusCode = 403;
}

export class NotFoundError extends ApiError {
  name = "NotFoundError";
  statusCode = 404;
}

export class ProjectRevisionError extends ApiError {
  name = "ProjectRevisionError";
  statusCode = 412;
}

export class SchemaMismatchError extends ApiError {
  name = "SchemaMismatchError";
  statusCode = 412;
}

export class StaleCliError extends ApiError {
  name = "StaleCliError";
  statusCode = 426;
}

export class BadRequestError extends ApiError {
  name = "BadRequestError";
  statusCode = 400;
}

export class AuthError extends ApiError {
  name = "AuthError";
  statusCode = 403;
}

export class PreconditionFailedError extends ApiError {
  name = "PreconditionFailed";
  statusCode = 412;
}

export class UnknownReferencesError extends ApiError {
  name = "UnknownReferencesError";
  statusCode = 412;
}

export class BundleTypeError extends ApiError {
  name = "BundleTypeError";
  statusCode = 412;
}

export class CopilotRateLimitExceededError extends ApiError {
  name = "CopilotRateLimitExceededError";
  statusCode = 429;
}

export class GrantUserNotFoundError extends ApiError {
  name = "GrantUserNotFoundError";
  statusCode = 404;
  message = "Unable to grant access to a non-existent user";
}

export class LoaderBundlingError extends ApiError {
  name = "LoaderBundlingError";
  statusCode = 412;
}

export class LoaderDeprecatedVersionError extends ApiError {
  name = "LoaderDeprecatedVersionError";
  statusCode = 412;
  message = "Please upgrade your @plasmicapp/* packages.";
}

// This is not an ApiError by design, so that we consider it an unhandled error
export class LoaderEsbuildFatalError extends Error {
  name = "LoaderEsbuildFatalError";
}

/**
 * We can't simply use instanceof ApiError, since our build pipeline doesn't
 * handle extending Error correctly. class extends Error works fine with
 * instanceof in normal ES6, but not in our TS compiles.
 */
export function isApiError(err: Error): err is ApiError {
  return !!(err as any).statusCode;
}

const errorNameRegistry = {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ProjectRevisionError,
  SchemaMismatchError,
  StaleCliError,
  AuthError,
  UnknownReferencesError,
  BundleTypeError,
  EntityNotFound: NotFoundError,
  BadRequestError,
  CopilotRateLimitExceededError,
  GrantUserNotFoundError,
};

/**
 * We can't simply use instanceof DbMgrError, since our build pipeline doesn't
 * handle extending Error correctly. class extends Error works fine with
 * instanceof in normal ES6, but not in our TS compiles.
 */
export function transformErrors(err: Error): Error {
  if (
    err.message === "CSRF token missing" ||
    err.message === "CSRF token mismatch"
  ) {
    return new AuthError(err.message);
  }
  const transformedErrType = errorNameRegistry[err.name];
  if (transformedErrType) {
    err = new transformedErrType(err.message);
  }
  return err;
}
