import { ApiTeam, UniqueFieldCheck } from "@/wab/shared/ApiSchema";

export class UniqueViolationError extends Error {
  readonly name = "unique-violation";
  readonly statusCode = 409;
  constructor(public readonly violations: UniqueFieldCheck[]) {
    super();
  }
}

export class UserHasTeamOwnershipError extends Error {
  readonly name = "account-deletion-forbidden";
  readonly statusCode = 403;
  constructor(public readonly selfOwnedTeams: ApiTeam[]) {
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

export function isUserHasTeamOwnershipError(
  err: unknown
): err is UserHasTeamOwnershipError {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    err.name === "account-deletion-forbidden"
  );
}
