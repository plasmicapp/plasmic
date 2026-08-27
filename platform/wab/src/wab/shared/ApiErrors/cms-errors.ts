import { ApiError } from "@/wab/shared/ApiErrors/ApiError";
import { UniqueFieldCheck } from "@/wab/shared/ApiSchema";

export class UniqueViolationError extends ApiError {
  name = "unique-violation";
  statusCode = 409;
  constructor(public readonly violations: UniqueFieldCheck[]) {
    super();
  }
}

export function isUniqueViolationError(
  err: unknown
): err is UniqueViolationError {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    err.name === "unique-violation"
  );
}
