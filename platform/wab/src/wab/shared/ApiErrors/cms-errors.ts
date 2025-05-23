import { UniqueFieldCheck } from "@/wab/shared/ApiSchema";

export class UniqueViolationError extends Error {
  readonly name = "unique-violation";
  readonly statusCode = 409;
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
