/**
 * Base class for errors that are sent to the client with a specific HTTP
 * status code. See errors.ts for the concrete errors.
 */
export abstract class ApiError extends Error {
  name = "ApiError";
  statusCode = 400;
}
