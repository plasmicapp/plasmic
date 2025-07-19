import {
  ANON_USER,
  DbMgr,
  SUPER_USER,
  normalActor,
  teamActor,
} from "@/wab/server/db/DbMgr";
import { User } from "@/wab/server/entities/Entities";
import "@/wab/server/extensions";
import { asyncTimed, callsToServerTiming } from "@/wab/server/timing-util";
import {
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from "@/wab/shared/ApiErrors/errors";
import { CmsIdAndToken, ProjectIdAndToken } from "@/wab/shared/ApiSchema";
import { asyncWrapper, omitNils } from "@/wab/shared/common";
import { NextFunction, Request, Response } from "express-serve-static-core";
import L from "lodash";

export function hasUser(req: Request) {
  return !!req.user;
}

export function getUser(
  req: Request,
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
  req: Request,
  opts?: { allowUnverifiedEmail: boolean }
) {
  const isSpy = req.cookies["plasmic-spy"] === "true";
  let dbMgr = new DbMgr(
    req.txMgr,
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

export function superDbMgr(req: Request) {
  let dbMgr = new DbMgr(req.txMgr, SUPER_USER);
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

export function adminOnly(req: Request, res: Response, next: NextFunction) {
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

// Used to wrap action routes.
// Will resolve transaction if succeeed or call next error handler if failed.
export function withNext(
  f: (req: Request, res: Response, next: NextFunction) => Promise<void> | void
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.timingStore) {
      // For Plasmic users, let's instrument the DbMgr and track their call durations.
      // The actual instrumentation happens in userDbMgr(). Here, we intercept req.send()
      // so we can inject the Server-Timing header before sending.
      const store = req.timingStore;
      const _send = res.send;
      res.send = (...args: any) => {
        if (!res.headersSent) {
          res.setHeader("Server-Timing", callsToServerTiming(store.calls));
        }
        // Very chatty if activated...
        // if (store.calls && store.calls.length > 0) {
        //   console.log(`TIMING: ${req.method} ${req.path}: ${JSON.stringify(serializeCallDurations(store.calls))}`);
        // }
        return _send.bind(res)(...args);
      };
    }
    asyncWrapper(f)(req, res, next).then(
      async () => await req.resolveTransaction(),
      (err) => next(err)
    );
  };
}
