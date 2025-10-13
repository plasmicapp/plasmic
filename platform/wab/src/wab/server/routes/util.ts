import {
  ANON_USER,
  DbMgr,
  SUPER_USER,
  normalActor,
  teamActor,
} from "@/wab/server/db/DbMgr";
import { User } from "@/wab/server/entities/Entities";
import "@/wab/server/extensions";
import { logError } from "@/wab/server/server-util";
import { asyncTimed } from "@/wab/server/timing-util";
import {
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from "@/wab/shared/ApiErrors/errors";
import { CmsIdAndToken, ProjectIdAndToken } from "@/wab/shared/ApiSchema";
import { omitNils } from "@/wab/shared/common";
import { AppRouter } from "@ts-rest/core";
import { createExpressEndpoints } from "@ts-rest/express";
import {
  RouterImplementation,
  TsRestExpressOptions,
} from "@ts-rest/express/src/lib/types";
import {
  NextFunction,
  Request,
  Response,
  type IRouter,
} from "express-serve-static-core";
import L from "lodash";
import type { Readable } from "stream";
import { EntityManager } from "typeorm";
import { ZodIssue } from "zod";

/**
 * Request that is compatible with normal `Request`s and ts-rest `Request`s.
 *
 * ts-rest modifies the `query` field so it matches the shape of its schema,
 * which makes it incompatible with normal Express requests.
 * Therefore, we omit `query` from the type since it's usually unnecessary for
 * generic request handling code.
 *
 * Some fields on `Request` return `this`, which is also problematic since it
 * references the original `Request` type. This is handled by omitting the
 * fields `setTimeout` and all fields of the extended class `Readable`.
 */
export type CompatRequest = Omit<
  Request,
  "query" | "setTimeout" | keyof Readable
>;

export function hasUser(req: CompatRequest) {
  return !!req.user;
}

export function getUser(
  req: CompatRequest,
  opts?: { allowUnverifiedEmail: boolean }
) {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  if (!opts?.allowUnverifiedEmail && req.user.waitingEmailVerification) {
    throw new UnauthorizedError();
  }
  return req.user;
}

export function userDbMgr(
  req: CompatRequest,
  opts?: { allowUnverifiedEmail: boolean }
) {
  const isSpy = req.cookies["plasmic-spy"] === "true";
  let dbMgr = new DbMgr(
    req,
    req.user
      ? normalActor(getUser(req, opts).id, isSpy)
      : req.apiTeam
      ? teamActor(req.apiTeam.id)
      : ANON_USER,
    {
      projectIdsAndTokens:
        (req.body.projectIdsAndTokens as ProjectIdAndToken[] | undefined) ??
        parseProjectIdsAndTokensHeader(
          req.headers["x-plasmic-api-project-tokens"]
        ),
      teamApiToken: req.body.teamApiToken ?? req.headers["x-plasmic-api-token"],
      temporaryTeamApiToken:
        req.body.sessionToken ?? req.headers["x-plasmic-api-session-token"],
      cmsIdsAndTokens: parseCmsIdsAndTokensHeader(
        req.headers["x-plasmic-api-cms-tokens"]
      ),
    }
  );
  if (req.timingStore) {
    dbMgr = timingDbMgr(dbMgr);
  }
  return dbMgr;
}

export function parseProjectIdsAndTokensHeader(value: any) {
  if (!value || typeof value !== "string") {
    return undefined;
  }

  const parsed = value
    .trim()
    .split(",")
    .map((val) => {
      const [projectId, projectApiToken] = val.split(":");
      if (!projectId || !projectApiToken) {
        throw new BadRequestError(
          `Invalid values for x-plasmic-api-project-tokens header`
        );
      }
      return {
        projectId: projectId.trim(),
        projectApiToken: projectApiToken.trim(),
      } as ProjectIdAndToken;
    });

  return parsed.length === 0 ? undefined : parsed;
}

export function parseCmsIdsAndTokensHeader(value: any) {
  if (!value || typeof value !== "string") {
    return undefined;
  }

  const parsed = value
    .trim()
    .split(",")
    .map((val) => {
      const [databaseId, token] = val.split(":");
      if (!databaseId || !token) {
        throw new BadRequestError(
          `Invalid values for x-plasmic-api-cms-tokens header`
        );
      }
      return {
        databaseId: databaseId.trim(),
        token: token.trim(),
      } as CmsIdAndToken;
    });

  return parsed.length === 0 ? undefined : parsed;
}

export function superDbMgr(req: CompatRequest) {
  let dbMgr = new DbMgr(req, SUPER_USER);
  if (req.timingStore) {
    dbMgr = timingDbMgr(dbMgr);
  }
  return dbMgr;
}

export function makeUserTraits(user: User) {
  return omitNils({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    domain: user.email.split("@")[1],
    source: user.source,
    createdAt: user.createdAt.toISOString(),
    ...user.surveyResponse,
  });
}

/**
 * Parses metadata from the CLI
 * We want an object that we can spread into the event properties
 * @param m
 */
export function parseMetadata(m?: any) {
  if (!m) {
    return {};
  } else if (typeof m === "object") {
    return m;
  } else {
    return {
      metadata: m,
    };
  }
}

export function parseQueryParams(req: Request) {
  return L.mapValues(req.query, (v) => JSON.parse(v as string));
}

/**
 * Instruments all methods of the DbMgr to time durations
 */
function timingDbMgr(dbMgr: DbMgr) {
  const props = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(dbMgr));
  for (const [prop, descriptor] of Object.entries(props)) {
    if (prop !== "constructor" && typeof descriptor.value === "function") {
      const orig = descriptor.value;
      const wrapped = asyncTimed(`${orig.name}`, orig.bind(dbMgr));
      Object.defineProperty(dbMgr, prop, {
        value: wrapped,
      });
    }
  }
  return dbMgr;
}

export function adminOnly(req: Request, _res: Response, next: NextFunction) {
  const user = req.user as User | undefined;
  if (
    user?.email &&
    req.config.adminEmails.includes(user.email.toLowerCase())
  ) {
    next();
  } else {
    next(new ForbiddenError());
  }
}

export function adminOrDevelopmentEnvOnly(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (process.env.NODE_ENV !== "production") {
    next();
  } else {
    adminOnly(req, res, next);
  }
}

export type TransactionCommit<T> = {
  type: "commit";
  commit: T;
  rollback?: undefined;
};

export type TransactionRollback<T> = {
  type: "rollback";
  commit?: undefined;
  rollback: T;
};

function isTransactionRollback<T>(x: unknown): x is TransactionRollback<T> {
  return (
    typeof x === "object" && x !== null && "type" in x && x.type === "rollback"
  );
}

export type TransactionEnd<TCommit, TRollback> =
  | TransactionCommit<TCommit>
  | TransactionRollback<TRollback>;

export function commitTransaction(): TransactionCommit<undefined>;
export function commitTransaction<T>(data: T): TransactionCommit<T>;
export function commitTransaction<T>(
  data?: T
): TransactionCommit<T | undefined> {
  return {
    type: "commit",
    commit: data as T,
  };
}

export function rollbackTransaction(): TransactionRollback<undefined>;
export function rollbackTransaction<T>(data: T): TransactionRollback<T>;
export function rollbackTransaction<T>(
  data?: T
): TransactionRollback<T | undefined> {
  return {
    type: "rollback",
    rollback: data as T,
  };
}

/**
 * Starts a database transaction that must be committed or rolled back.
 *
 * Data in the transaction can be passed outside using `commitTransaction` and
 * `rollbackTransaction`.
 */
export async function startTransaction<TCommit>(
  req: Request,
  f: (txMgr: EntityManager) => Promise<TransactionCommit<TCommit>>
): Promise<TransactionCommit<TCommit>>;
export async function startTransaction<TRollback>(
  req: Request,
  f: (txMgr: EntityManager) => Promise<TransactionRollback<TRollback>>
): Promise<TransactionRollback<TRollback>>;
export async function startTransaction<TCommit, TRollback>(
  req: Request,
  f: (txMgr: EntityManager) => Promise<TransactionEnd<TCommit, TRollback>>
): Promise<TransactionEnd<TCommit, TRollback>>;
export async function startTransaction<TCommit, TRollback>(
  req: Request,
  f: (txMgr: EntityManager) => Promise<TransactionEnd<TCommit, TRollback>>
): Promise<TransactionEnd<TCommit, TRollback>> {
  // PostgreSQL does NOT support nested transactions.
  // We shouldn't either, but we fake it for now since we have so many existing
  // withNext calls.
  // If we accidentally nest transactions, the inner transaction rollback would
  // not be propagated to the outer transaction, causing unexpected commits.
  // TODO: Replace this code with `assert(!req.txMgr)` and delete `txRollback`.
  if (req.txMgr) {
    logError(new Error("ALREADY IN NESTED TRANSACTION"));
    try {
      const txEnd = await f(req.txMgr);
      if (isTransactionRollback(txEnd)) {
        req.txRollback?.();
      }
      return txEnd;
    } catch (err) {
      req.txRollback?.();
      throw err;
    }
  }

  try {
    return await req.con.transaction(async (txMgr) => {
      let nestedRollback = false;
      req.txMgr = txMgr;
      req.txRollback = () => {
        nestedRollback = true;
      };
      const result = await f(txMgr);
      if (isTransactionRollback(result)) {
        throw result;
      } else {
        if (nestedRollback) {
          throw result;
        } else {
          return result;
        }
      }
    });
  } catch (err) {
    if (isTransactionRollback<TRollback>(err)) {
      return err;
    } else {
      throw err;
    }
  } finally {
    req.txMgr = undefined;
  }
}

/**
 * Wraps a route handler in a database transaction.
 * The transaction will automatically commit on resolve or rollback on reject.
 *
 * @deprecated use {@link startTransaction} to manually wrap queries
 */
export function withNext(
  f: (req: Request, res: Response, next: NextFunction) => Promise<void> | void
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await startTransaction(req, async () => {
        await f(req, res, next);
        return commitTransaction();
      });
    } catch (error) {
      next(error);
    }
  };
}

export function createTsRestEndpoints<TRouter extends AppRouter>(
  contract: TRouter,
  server: RouterImplementation<TRouter>,
  app: IRouter,
  options?: Omit<TsRestExpressOptions<TRouter>, "requestValidationErrorHandler">
): void {
  createExpressEndpoints(contract, server, app, {
    // Convert to BadRequestError, let our error middleware handle this
    requestValidationErrorHandler: (err, _req, _res, _next) => {
      function issueMap(issue: ZodIssue) {
        return `${issue.path.join(".")}: ${issue.message}`;
      }

      const issues = {};
      if (err.headers) {
        issues["headers"] = err.headers.issues.map(issueMap);
      }
      if (err.pathParams) {
        issues["pathParams"] = err.pathParams.issues.map(issueMap);
      }
      if (err.query) {
        issues["query"] = err.query.issues.map(issueMap);
      }
      if (err.body) {
        issues["body"] = err.body.issues.map(issueMap);
      }

      throw new BadRequestError("Request validation failed. See issues.", {
        issues,
      });
    },
    ...options,
  });
}
