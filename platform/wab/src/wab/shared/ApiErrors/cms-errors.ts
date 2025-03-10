import { UniqueFieldCheck } from "@/wab/shared/ApiSchema";

export class UniqueViolationError extends Error {
  name = "unique-violation";
  statusCode = 409;
  violations: UniqueFieldCheck[];
  constructor(violations: UniqueFieldCheck[]) {
    super();
    this.violations = violations;
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
