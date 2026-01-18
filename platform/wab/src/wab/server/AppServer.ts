import * as Sentry from "@sentry/node";
import * as bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import errorHandler from "errorhandler";
import express, { ErrorRequestHandler, RequestHandler } from "express";
import "express-async-errors";
import promMetrics from "express-prom-bundle";
import { NextFunction, Request, Response } from "express-serve-static-core";
import session from "express-session";
import * as lusca from "lusca";
import { nanoid } from "nanoid";
import cron from "node-cron";
import passport from "passport";
import * as path from "path";
import { getConnection } from "typeorm";
import v8 from "v8";
// API keys and Passport configuration
import { setupPassport } from "@/wab/server/auth/passport-cfg";
import * as authRoutes from "@/wab/server/auth/routes";
import { apiAuth } from "@/wab/server/auth/routes";
import { doLogout } from "@/wab/server/auth/util";
import { Config } from "@/wab/server/config";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { getDevFlagsMergedWithOverrides } from "@/wab/server/db/appconfig";
import { createMailer } from "@/wab/server/emails/Mailer";
import { ExpressSession } from "@/wab/server/entities/Entities";
import "@/wab/server/extensions";
import { initAnalyticsFactory, logger } from "@/wab/server/observability";
import {
  DEFAULT_HISTOGRAM_BUCKETS,
  WabPromLiveRequestsGauge,
  trackPostgresPool,
} from "@/wab/server/promstats";
import { createRateLimiter } from "@/wab/server/rate-limit";
import * as adminRoutes from "@/wab/server/routes/admin";
import {
  getAnalyticsBillingInfoForTeam,
  getAnalyticsForProject,
  getAnalyticsForTeam,
  getAnalyticsProjectMeta,
} from "@/wab/server/routes/analytics";
import * as apiTokenRoutes from "@/wab/server/routes/apitokens";
import {
  getEndUserByToken,
  grantOauthToken,
  issueOauthCode,
  upsertEndUser,
} from "@/wab/server/routes/app-oauth";
import { getAppCtx } from "@/wab/server/routes/appctx";
import {
  cachePublicCmsRead,
  publicCmsReadsServer,
  publicCreateRows,
  publicDeleteRow,
  publicPublishRow,
  publicUpdateRow,
  upsertDatabaseTables,
} from "@/wab/server/routes/cms";
import {
  checkUniqueFields,
  cloneDatabase,
  cloneRow,
  cmsFileUpload,
  createDatabase,
  createRows,
  createTable,
  deleteDatabase,
  deleteRow,
  deleteTable,
  getCmsDatabaseAndSecretTokenById,
  getRow as getCmseRow,
  getDatabaseMeta,
  getRowRevision,
  listDatabases,
  listDatabasesMeta,
  listRowRevisions,
  listRows,
  triggerTableWebhooks,
  updateDatabase,
  updateRow,
  updateTable,
} from "@/wab/server/routes/cmse";
import { addCommentsRoutes } from "@/wab/server/routes/comments";
import {
  ROUTES_WITH_TIMING,
  addInternalRoutes,
} from "@/wab/server/routes/custom-routes";
import {
  allowProjectToDataSource,
  createDataSource,
  deleteDataSource,
  executeDataSourceStudioOperationHandler,
  getDataSourceById,
  getDataSourceOperationId,
  listAirtableBases,
  listDataSources,
  testDataSourceConnection,
  updateDataSource,
} from "@/wab/server/routes/data-source";
import {
  getFakeBlurbs,
  getFakePlans,
  getFakePosts,
  getFakeTasks,
  getFakeTestimonials,
  getFakeTweets,
} from "@/wab/server/routes/demodata";
import { discourseConnect } from "@/wab/server/routes/discourse";
import {
  addDirectoryEndUsers,
  changeAppRolesOrder,
  createAccessRules,
  createDirectoryGroup,
  createEndUserDirectory,
  createRole,
  deleteAccessRule,
  deleteAppAccessRegister,
  deleteAppAuthConfig,
  deleteAppRole,
  deleteDirectory,
  deleteDirectoryGroup,
  disableAppAuth,
  getAppAuthConfig,
  getAppAuthPubConfig,
  getAppCurrentUserOpConfig,
  getAppCurrentUserProperties,
  getDirectoryUsers,
  getEndUserDirectory,
  getEndUserDirectoryApps,
  getInitialUserToViewAs,
  getUserRoleInApp,
  listAppAccessRegistries,
  listAppAccessRules,
  listAppUsers,
  listDirectoryGroups,
  listRoles,
  listTeamEndUserDirectories,
  removeEndUserFromDirectory,
  updateAccessRule,
  updateAppRole,
  updateDirectoryGroup,
  updateEndUserDirectory,
  updateEndUserGroups,
  upsertAppAuthConfig,
  upsertCurrentUserOpConfig,
} from "@/wab/server/routes/end-user";
import {
  addProjectRepository,
  connectGithubInstallations,
  deleteProjectRepository,
  detectOptionsFromDirectory,
  fireGitAction,
  getGitWorkflowJob,
  getLatestWorkflowRun,
  getProjectRepositories,
  githubBranches,
  githubData,
  setupExistingGithubRepo,
  setupNewGithubRepo,
} from "@/wab/server/routes/git";
import {
  addTrustedHost,
  deleteTrustedHost,
  getTrustedHostsForSelf,
} from "@/wab/server/routes/hosts";
import { uploadImage } from "@/wab/server/routes/image";
import {
  buildLatestLoaderAssets,
  buildLatestLoaderHtml,
  buildLatestLoaderReprV2,
  buildLatestLoaderReprV3,
  buildPublishedLoaderAssets,
  buildPublishedLoaderHtml,
  buildPublishedLoaderReprV2,
  buildPublishedLoaderReprV3,
  buildVersionedLoaderAssets,
  buildVersionedLoaderHtml,
  buildVersionedLoaderReprV2,
  buildVersionedLoaderReprV3,
  getHydrationScript,
  getHydrationScriptVersioned,
  getLoaderChunk,
  prefillPublishedLoader,
} from "@/wab/server/routes/loader";
import { genTranslatableStrings } from "@/wab/server/routes/localization";
import * as mailingListRoutes from "@/wab/server/routes/mailinglist";
import { getAppConfig, getClip, putClip } from "@/wab/server/routes/misc";
import {
  createProjectWebhook,
  deleteProjectWebhook,
  getProjectWebhookEvents,
  getProjectWebhooks,
  triggerProjectWebhook,
  updateProjectWebhook,
} from "@/wab/server/routes/project-webhooks";
import {
  checkAndNofityHostlessVersion,
  cloneProject,
  clonePublishedTemplate,
  computeNextProjectVersion,
  createBranch,
  createPkgByProjectId,
  createProject,
  createProjectWithHostlessPackages,
  deleteBranch,
  deleteProject,
  fmtCode,
  genCode,
  genIcons,
  genStyleConfig,
  genStyleTokens,
  getFullProjectData,
  getLatestBundleVersion,
  getLatestPlumePkg,
  getModelUpdates,
  getPkgByProjectId,
  getPkgVersion,
  getPkgVersionByProjectId,
  getPkgVersionPublishStatus,
  getPlumePkg,
  getPlumePkgVersionStrings,
  getProjectMeta,
  getProjectRev,
  getProjectRevWithoutData,
  getProjectRevision,
  getProjectSyncMetadata,
  importProject,
  latestCodegenVersion,
  listBranchesForProject,
  listPkgVersionsWithoutData,
  listProjectVersionsWithoutData,
  listProjects,
  listUnpublishedProjectRevisions,
  publishProject,
  removeSelfPerm,
  requiredPackages,
  resolveSync,
  revertProjectToRevision,
  revertToVersion,
  saveProjectRev,
  setMainBranchProtection,
  tryMergeBranch,
  updateBranch,
  updateHostUrl,
  updatePkgVersion,
  updateProject,
  updateProjectData,
  updateProjectMeta,
} from "@/wab/server/routes/projects";
import { getPromotionCodeById } from "@/wab/server/routes/promo-code";
import {
  executeDataSourceOperationHandler,
  executeDataSourceOperationHandlerInStudio,
} from "@/wab/server/routes/server-data";
import { processSvgRoute } from "@/wab/server/routes/svg";
import * as teamRoutes from "@/wab/server/routes/teams";
import { getUsersById } from "@/wab/server/routes/users";
import {
  adminOnly,
  adminOrDevelopmentEnvOnly,
  createTsRestEndpoints,
  superDbMgr,
  withNext,
} from "@/wab/server/routes/util";
import {
  createWhiteLabelUser,
  deleteWhiteLabelUser,
  getWhiteLabelUser,
  openJwt,
} from "@/wab/server/routes/whitelabel";
import {
  createWorkspace,
  deleteWorkspace,
  getPersonalWorkspace,
  getWorkspace,
  getWorkspaces,
  updateWorkspace,
} from "@/wab/server/routes/workspaces";
import { logError } from "@/wab/server/server-util";
import {
  ASYNC_TIMING,
  callsToServerTiming,
  serializeCallDurations,
} from "@/wab/server/timing-util";
import { TypeormStore } from "@/wab/server/util/TypeormSessionStore";
import {
  pruneOldBundleBackupsCache,
  prunePartialRevCache,
} from "@/wab/server/util/pruneCache";
import { createWorkerPool } from "@/wab/server/workers/pool";
import { ensureDevFlags } from "@/wab/server/workers/worker-utils";
import {
  AuthError,
  NotFoundError,
  isApiError,
  transformErrors,
} from "@/wab/shared/ApiErrors/errors";
import { publicCmsReadsContract } from "@/wab/shared/api/cms";
import { Bundler } from "@/wab/shared/bundler";
import { mkShortId, safeCast, spawn } from "@/wab/shared/common";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { isStampedIgnoreError } from "@/wab/shared/error-handling";
import fileUpload from "express-fileupload";

const csrfFreeStaticRoutes = [
  "/api/v1/admin/user",
  "/api/v1/admin/resetPassword",
  "/api/v1/admin/delete-project",
  "/api/v1/admin/restore-project",
  "/api/v1/admin/login-as",
  "/api/v1/admin/devflags",
  "/api/v1/admin/clone",
  "/api/v1/admin/deactivate-user",
  "/api/v1/admin/revert-project-revision",
  "/api/v1/mail/subscribe",
  "/api/v1/plume-pkg/versions",
  "/api/v1/localization/gen-texts",
  "/api/v1/hosting-hit",
  "/api/v1/socket/",
  "/api/v1/init-token/",
  "/api/v1/promo-code/",

  // csrf-free routes to the socket server routes, if socket server
  // is not running and the routes are mounted on this server
  "/api/v1/disconnect",
  "/api/v1/projects/broadcast",
  "/api/v1/cli/emit-token",
];

const isCsrfFreeRoute = (pathname: string, config: Config) => {
  return (
    csrfFreeStaticRoutes.includes(pathname) ||
    pathname.includes("/api/v1/clip/") ||
    pathname.includes("/code/") ||
    pathname.includes("/api/v1/loader/code") ||
    pathname.includes("/api/v1/loader/chunks") ||
    pathname.includes("/jsbundle") ||
    pathname.includes("/api/v1/loader/") ||
    pathname.includes("/api/v1/server-data/") ||
    pathname.includes("/api/v1/wl/") ||
    pathname.includes("/api/v1/cms/") ||
    pathname.match("/api/v1/projects/[^/]+$") ||
    pathname.match("/api/v1/auth/sso/.*/consume") ||
    pathname.includes("/api/v1/app-auth/user") ||
    pathname.includes("/api/v1/app-auth/userinfo") ||
    pathname.includes("/api/v1/app-auth/token") ||
    pathname.includes("/api/v1/copilot/ui/public") ||
    (!config.production &&
      (pathname === "/api/v1/projects/import" ||
        pathname.includes("/api/v1/cmse/")))
  );
};

const ignoredErrorMessages = [
  "CSRF token mismatch",
  "Connection closed before response fulfilled",
  // This happens whenever the client disconnects first, and the
  // server hasn't finished the response yet and attempts to make
  // a typeorm query. Nothing we can do about that.
  "Query runner already released",
];

function shouldIgnoreErrorByMessage(message: string) {
  return ignoredErrorMessages.some((pattern) => message.includes(pattern));
}

function addSentry(app: express.Application, config: Config) {
  if (!config.sentryDSN) {
    return;
  }
  logger().debug(`Initializing Sentry with DSN: ${config.sentryDSN}`);
  Sentry.init({
    dsn: config.sentryDSN,
    // We need beforeSend because errors don't necessarily make their way through the Express pipeline - they can be
    // thrown from anywhere, in Express or outside (or from random async event loop iterations).
    async beforeSend(event: Sentry.Event): Promise<Sentry.Event | null> {
      const msg = event.exception?.values?.[0].value;
      if (msg) {
        if (shouldIgnoreErrorByMessage(msg)) {
          return null;
        }
      }
      return event;
    },
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  // This anonymous handler uses Sentry.setTag() to modify the current scope.
  // To ensure the global scope is not modified, the handler must be after
  // Sentry.Handlers.requestHandler(), which creates a new scope per-request.
  app.use((req, _res, next) => {
    // Some routes get project ID as a path param (e.g.
    // /projects/:projectId/code/components) while others get it as query
    // (e.g. /loader/code/versioned?projectId=<>).
    const projectId =
      req.params.projectId ?? req.query.projectId ?? req.params.projectBranchId;
    if (projectId) {
      Sentry.setTag("projectId", String(projectId));
    }
    next();
  });
}

// Copied from @sentry: https://github.com/getsentry/sentry-javascript/blob/master/packages/node/src/handlers.ts
export function getStatusCodeFromResponse(error: any): number {
  const statusCode =
    error.status ||
    error.statusCode ||
    error.status_code ||
    (error.output && error.output.statusCode);
  return statusCode ? parseInt(statusCode as string, 10) : 500;
}

function addSentryError(app: express.Application, config: Config) {
  if (!config.sentryDSN) {
    return;
  }

  /** Returns true if response code is internal server error */
  const defaultShouldHandleError = (error: any): boolean => {
    const status = getStatusCodeFromResponse(transformErrors(error));
    return status >= 500;
  };

  const shouldHandleError = (error) => {
    if (shouldIgnoreErrorByMessage(error.message || "")) {
      return false;
    }
    if (isStampedIgnoreError(error)) {
      return false;
    }
    if (error["request"]?.headers?.["user-agent"]?.startsWith("octokit")) {
      // Errors from Octokit (GitHub client) should always be logged,
      // even if status code < 500.
      return true;
    }
    return defaultShouldHandleError(error);
  };

  app.use(Sentry.Handlers.errorHandler({ shouldHandleError }));
}

export function addLoggingMiddleware(app: express.Application) {
  app.use(
    safeCast<RequestHandler>(async (req: Request, res, next) => {
      req.id = mkShortId();
      next();
    })
  );
  app.use((req: Request, res: any, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      logger().info(
        `${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`,
        {
          requestMethod: req.method,
          requestOriginalUrl: req.originalUrl,
          requestStatusCode: res.statusCode,
          requestId: req.id,
          remoteAddr: req.ip,
          userEmail: req.user?.email,
          referrer: req.get("referrer"),
          userAgent: req.get("user-agent"),
          contentLength: res.get("content-length"),
        }
      );
    });
    next();
  });
}

/**
 * Handles /metrics route and sets up the live request gauge.
 *
 * Call `app.set("name", <app-name>)` to set the `app` label on the gauge.
 */
export function addPromMetricsMiddleware(app: express.Application) {
  const name = app.get("name");

  app.use(
    safeCast<RequestHandler>(async (req: Request, res, next) => {
      // Live requests for all routes after this middleware will be tracked.
      const liveRequestsGauge = new WabPromLiveRequestsGauge(app.get("name"));
      liveRequestsGauge.onReqStart(req);
      // 'close' event is emitted in all HTTP request scenarios
      // https://nodejs.org/api/http.html#httprequesturl-options-callback
      res.on("close", () => {
        liveRequestsGauge.onReqEnd(req, res);
      });

      // Initialize req.promLabels, used in various routes to add custom labels.
      req.promLabels = {};

      next();
    })
  );

  // Handles /metrics
  app.use(
    promMetrics({
      customLabels: {
        route: null,
        projectId: null,
        // Also keep track of url for codegen, as the set of
        // urls codegen uses is reasonably small
        ...(name === "codegen" && {
          url: null,
        }),
      },
      includeMethod: true,
      includeStatusCode: true,
      includePath: true,
      transformLabels: (labels, req, _res) => {
        labels.route = req.route?.path;
        if (name === "codegen") {
          labels.url = req.originalUrl;
        }
        Object.assign(labels, req.promLabels ?? {});
      },
      promClient: {
        collectDefaultMetrics: {},
      },
      buckets: DEFAULT_HISTOGRAM_BUCKETS,
    })
  );
}

function addMiddlewares(
  app: express.Application,
  config: Config,
  opts?: {
    skipSession?: boolean;
  }
) {
  addPromMetricsMiddleware(app);
  addLoggingMiddleware(app);
  app.use(cookieParser());

  // Our OPTIONS requests return fixed responses that don't depend on other
  // middleware, so handle them before session middleware and others.
  addOptionsRoutes(app);

  if (!opts?.skipSession) {
    app.use(makeExpressSessionMiddleware(config));
    app.use(passport.initialize());
    app.use(passport.session());
  } else {
    logger().debug("Skipping session store setup...");
  }

  const analyticsFactory = initAnalyticsFactory({
    production: config.production,
  });

  // Attach a fresh analytics instance to every request via `req.analytics`.
  // NOTE: We intentionally create a new instance for each request to avoid
  // accidental cross-request state leakage (for example via `setUser`).
  app.use(
    safeCast<RequestHandler>(async (req, _res, next) => {
      req.analytics = analyticsFactory();
      req.analytics.appendBaseEventProperties({
        host: config.host,
        production: config.production,
      });

      if (req.user?.id) {
        req.analytics.setUser(req.user.id);
      }

      next();
    })
  );

  app.use((req, res, next) => {
    // For Plasmic users, let's instrument the DbMgr and track their call durations.
    // The actual instrumentation happens in userDbMgr().
    // This is before we've loaded req.devflags - just use the hard-coded default for the core team email domain.
    if (
      isAdminTeamEmail(req.user?.email, DEVFLAGS) ||
      req.path.includes("/server-data") ||
      ROUTES_WITH_TIMING.some((route) => req.path.includes(route))
    ) {
      const timingStore = { calls: [], cur: undefined };
      req.timingStore = timingStore;
      ASYNC_TIMING.enterWith(req.timingStore);

      // Intercept req.send() so we can inject the Server-Timing header.
      const _send = res.send;
      res.send = (...args: any) => {
        if (!res.headersSent) {
          res.setHeader(
            "Server-Timing",
            callsToServerTiming(timingStore.calls)
          );
        }
        if (timingStore.calls && timingStore.calls.length > 0) {
          logger().debug("TIMING", {
            method: req.method,
            path: req.path,
            callDurations: serializeCallDurations(timingStore.calls),
          });
        }
        return _send.bind(res)(...args);
      };
    }
    next();
  });

  // Set up basic request configuration without universal transaction
  app.use(
    safeCast<RequestHandler>(async (req, res, next) => {
      const connectionPool = getConnection();
      req.config = config;
      req.con = connectionPool;
      req.noTxMgr = connectionPool.createEntityManager();
      req.mailer = createMailer();
      req.bundler = new Bundler();
      next();
    })
  );
  app.use(
    safeCast<ErrorRequestHandler>(
      async (err: Error, req: Request, res: Response, next: NextFunction) => {
        if (err) {
          // Gracefully logout/reset session if bad session
          await doLogout(req, res);
          next(err);
        } else {
          next();
        }
      }
    )
  );
  app.use(safeCast<RequestHandler>(authRoutes.authApiTokenMiddleware));
  if (!opts?.skipSession) {
    const csrf = lusca.csrf();
    app.use((req, res, next) => {
      if (
        isCsrfFreeRoute(req.path, config) ||
        authRoutes.isPublicApiRequest(req)
      ) {
        // API requests also don't need csrf
        return next();
      } else {
        return csrf(req, res, next);
      }
    });
  } else {
    logger().debug("Skipping CSRF setup...");
  }

  // Parse body further down to prevent unauthorized users from incurring large parses.
  app.use(bodyParser.json({ limit: "400mb" }));
  app.use(bodyParser.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    // Just these two pages can be inside iframes, and only on studio.plasmic.app
    const baseName = path.basename(req.path);
    const isInnerFrame = baseName === "host.html";
    res.set("X-Frame-Options", isInnerFrame ? "SAMEORIGIN" : "DENY");
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });
  app.use(
    safeCast<RequestHandler>(async (req, res, next) => {
      const mgr = superDbMgr(req);
      const merged = await getDevFlagsMergedWithOverrides(mgr);
      req.devflags = merged;
      next();
    })
  );

  const workerpool = createWorkerPool(config);
  app.use(
    safeCast<RequestHandler>(async (req, res, next) => {
      req.workerpool = workerpool;
      next();
    })
  );
}

function addStaticRoutes(app: express.Application) {
  app.use(cors(), express.static("build"));
  app.use(cors(), express.static("public"));
}

function addOptionsRoutes(app: express.Application) {
  // Add CORS preflight routes before all the middlewares to avoid
  // connecting to the DB unnecessarily.
  app.options("/api/v1/cms/*", corsPreflight());
  app.options(
    "/api/v1/server-data/sources/:dataSourceId/execute",
    corsPreflight()
  );
  app.options("/api/v1/data-source/sources/:dataSourceId", corsPreflight());
  app.options("/api/v1/app-auth/token", corsPreflight());
  app.options("/api/v1/app-auth/userinfo", corsPreflight());
  app.options("/api/v1/loader/*", corsPreflight());
  // For mailing list subscriptions
  // allow subscription requests from anywhere (e.g. localhost or www.plasmic.app)
  app.options("/api/v1/mail/subscribe", cors());
}

export function addCmsPublicRoutes(app: express.Application) {
  // "Public" CMS API, access via API auth

  createTsRestEndpoints(publicCmsReadsContract, publicCmsReadsServer, app, {
    globalMiddleware: [cors(), apiAuth, cachePublicCmsRead],
  });

  app.put(
    "/api/v1/cms/databases/:dbId/tables",
    apiAuth,
    withNext(upsertDatabaseTables)
  );
  app.post(
    "/api/v1/cms/databases/:dbId/tables/:tableIdentifier/rows",
    withNext(publicCreateRows)
  );
  app.post("/api/v1/cms/rows/:rowId/publish", withNext(publicPublishRow));
  app.put("/api/v1/cms/rows/:rowId", withNext(publicUpdateRow));
  app.delete("/api/v1/cms/rows/:rowId", withNext(publicDeleteRow));
}

export function addCmsEditorRoutes(app: express.Application) {
  // CMS API for use by studio to crud; access by usual browser login
  app.get("/api/v1/cmse/databases", listDatabases);
  app.post("/api/v1/cmse/databases", withNext(createDatabase));
  app.post("/api/v1/cmse/databases/:dbId/clone", withNext(cloneDatabase));
  app.get("/api/v1/cmse/databases/:dbId", getCmsDatabaseAndSecretTokenById);
  app.get("/api/v1/cmse/databases-meta/:dbId", getDatabaseMeta);
  app.get("/api/v1/cmse/databases-meta", listDatabasesMeta);
  app.put("/api/v1/cmse/databases/:dbId", withNext(updateDatabase));
  app.delete("/api/v1/cmse/databases/:dbId", withNext(deleteDatabase));

  app.post("/api/v1/cmse/databases/:dbId/tables", withNext(createTable));
  app.put("/api/v1/cmse/tables/:tableId", withNext(updateTable));
  app.delete("/api/v1/cmse/tables/:tableId", withNext(deleteTable));

  app.get("/api/v1/cmse/tables/:tableId/rows", listRows);
  app.post("/api/v1/cmse/tables/:tableId/rows", withNext(createRows));
  app.post(
    "/api/v1/cmse/tables/:tableId/trigger-webhook",
    withNext(triggerTableWebhooks)
  );

  app.get("/api/v1/cmse/rows/:rowId", getCmseRow);
  app.get("/api/v1/cmse/rows/:rowId/revisions", listRowRevisions);
  app.put("/api/v1/cmse/rows/:rowId", withNext(updateRow));
  app.delete("/api/v1/cmse/rows/:rowId", withNext(deleteRow));
  app.post("/api/v1/cmse/rows/:rowId/clone", withNext(cloneRow));
  app.post(
    "/api/v1/cmse/tables/:tableId/check-unique-fields",
    withNext(checkUniqueFields)
  );
  app.get("/api/v1/cmse/row-revisions/:revId", getRowRevision);

  app.post(
    "/api/v1/cmse/file-upload",
    fileUpload({
      limits: {
        files: 8,
        fileSize: 8 * 1024 * 1024, // 8MB
      },
    }),
    withNext(cmsFileUpload)
  );
}

export function addWhiteLabelRoutes(app: express.Application) {
  app.post(
    "/api/v1/wl/:whiteLabelName/users",
    safeCast<RequestHandler>(authRoutes.teamApiAuth),
    withNext(createWhiteLabelUser)
  );
  app.get(
    "/api/v1/wl/:whiteLabelName/users/:externalUserId",
    safeCast<RequestHandler>(authRoutes.teamApiAuth),
    getWhiteLabelUser
  );
  app.delete(
    "/api/v1/wl/:whiteLabelName/users/:externalUserId",
    safeCast<RequestHandler>(authRoutes.teamApiAuth),
    withNext(deleteWhiteLabelUser)
  );
  app.get("/api/v1/wl/:whiteLabelName/open", openJwt);
}

export function addIntegrationsRoutes(app: express.Application) {
  app.post(
    "/api/v1/server-data/sources/:dataSourceId/execute",
    cors(),
    executeDataSourceOperationHandler
  );
}

export function addDataSourceRoutes(app: express.Application) {
  app.get("/api/v1/data-source/sources", listDataSources);
  app.get("/api/v1/data-source/sources/:dataSourceId", getDataSourceById);
  app.post("/api/v1/data-source/sources", withNext(createDataSource));
  app.post(
    "/api/v1/data-source/sources/test",
    withNext(testDataSourceConnection)
  );
  app.put(
    "/api/v1/data-source/sources/:dataSourceId",
    withNext(updateDataSource)
  );
  app.delete(
    "/api/v1/data-source/sources/:dataSourceId",
    withNext(deleteDataSource)
  );
  app.post(
    "/api/v1/data-source/sources/:dataSourceId",
    cors(),
    executeDataSourceStudioOperationHandler
  );
  app.post(
    "/api/v1/data-source/sources/:dataSourceId/op-id",
    withNext(getDataSourceOperationId)
  );
  app.post(
    "/api/v1/data-source/sources/:dataSourceId/execute-studio",
    executeDataSourceOperationHandlerInStudio
  );
  app.post(
    "/api/v1/data-source/sources/:dataSourceId/allow",
    withNext(allowProjectToDataSource)
  );
  // app.post("/api/v1/data-source/token", withNext(generateTemporaryToken));
  // app.delete("/api/v1/data-source/token", withNext(revokeTemporaryToken));

  // Bases endpoints

  app.get("/api/v1/data-source/airtable/bases", withNext(listAirtableBases));
}

export function addAnalyticsRoutes(app: express.Application) {
  app.get("/api/v1/analytics/team/:teamId", getAnalyticsForTeam);
  app.get(
    "/api/v1/analytics/team/:teamId/project/:projectId",
    getAnalyticsForProject
  );
  app.get(
    "/api/v1/analytics/team/:teamId/project/:projectId/meta",
    getAnalyticsProjectMeta
  );
  app.get(
    "/api/v1/analytics/team/:teamId/billing",
    getAnalyticsBillingInfoForTeam
  );
}

export function addAppAuthRoutes(app: express.Application) {
  // App-auth Oauth
  app.get("/api/v1/app-auth/code", issueOauthCode);

  app.get("/api/v1/app-auth/token", cors(), withNext(grantOauthToken));

  app.get("/api/v1/app-auth/userinfo", cors(), getEndUserByToken);

  app.post("/api/v1/app-auth/user", cors(), withNext(upsertEndUser));
}

export function addEndUserManagementRoutes(app: express.Application) {
  /**
   * App auth config
   */
  app.post(
    "/api/v1/end-user/app/:projectId/config",
    withNext(upsertAppAuthConfig)
  );
  app.get("/api/v1/end-user/app/:projectId/pub-config", getAppAuthPubConfig);
  app.get("/api/v1/end-user/app/:projectId/config", getAppAuthConfig);
  app.delete(
    "/api/v1/end-user/app/:projectId/config",
    withNext(deleteAppAuthConfig)
  );

  /**
   * Roles
   */
  app.get("/api/v1/end-user/app/:projectId/roles", listRoles);
  app.post("/api/v1/end-user/app/:projectId/roles", withNext(createRole));
  app.put(
    "/api/v1/end-user/app/:projectId/roles-orders",
    withNext(changeAppRolesOrder)
  );
  app.put(
    "/api/v1/end-user/app/:projectId/roles/:roleId",
    withNext(updateAppRole)
  );
  app.delete(
    "/api/v1/end-user/app/:projectId/roles/:roleId",
    withNext(deleteAppRole)
  );

  /**
   * User access to an app
   */
  app.get("/api/v1/end-user/app/:projectId/access-rules", listAppAccessRules);
  app.post(
    "/api/v1/end-user/app/:projectId/access-rules",
    withNext(createAccessRules)
  );
  app.put(
    "/api/v1/end-user/app/:projectId/access-rules/:accessId",
    withNext(updateAccessRule)
  );
  app.delete(
    "/api/v1/end-user/app/:projectId/access-rules/:accessId",
    withNext(deleteAccessRule)
  );
  app.get(
    "/api/v1/end-user/app/:projectId/user-role/:endUserId",
    getUserRoleInApp
  );

  /**
   * Directory manangement
   */
  app.post(
    "/api/v1/end-user/teams/:teamId/directory",
    withNext(createEndUserDirectory)
  );
  app.get("/api/v1/end-user/directories/:directoryId", getEndUserDirectory);
  app.put(
    "/api/v1/end-user/directories/:directoryId",
    withNext(updateEndUserDirectory)
  );
  app.get(
    "/api/v1/end-user/directories/:directoryId/apps",
    getEndUserDirectoryApps
  );
  app.get("/api/v1/end-user/directories/:directoryId/users", getDirectoryUsers);
  app.delete(
    "/api/v1/end-user/directories/:directoryId",
    withNext(deleteDirectory)
  );
  app.get(
    "/api/v1/end-user/teams/:teamId/directories",
    listTeamEndUserDirectories
  );

  /**
   * End user management
   * */
  app.post(
    "/api/v1/end-user/directories/:directoryId/users",
    withNext(addDirectoryEndUsers)
  );
  app.put(
    "/api/v1/end-user/directories/:directoryId/users/:userId/groups",
    withNext(updateEndUserGroups)
  );
  app.delete(
    "/api/v1/end-user/directories/:directoryId/users/:endUserId",
    withNext(removeEndUserFromDirectory)
  );

  /**
   * Directory Groups
   */
  app.get(
    "/api/v1/end-user/directories/:directoryId/groups",
    listDirectoryGroups
  );
  app.post(
    "/api/v1/end-user/directories/:directoryId/groups",
    withNext(createDirectoryGroup)
  );
  app.delete(
    "/api/v1/end-user/directories/:directoryId/groups/:groupId",
    withNext(deleteDirectoryGroup)
  );
  app.put(
    "/api/v1/end-user/directories/:directoryId/groups/:groupId",
    withNext(updateDirectoryGroup)
  );

  /**
   * App access registry
   */
  app.get(
    "/api/v1/end-user/app/:projectId/access-registry",
    listAppAccessRegistries
  );
  app.delete(
    "/api/v1/end-user/app/:projectId/access-registry/:accessId",
    withNext(deleteAppAccessRegister)
  );
  app.get("/api/v1/end-user/app/:projectId/app-users", withNext(listAppUsers));
  app.get(
    "/api/v1/end-user/app/:projectId/app-user",
    withNext(getInitialUserToViewAs)
  );

  /**
   * Disable app auth
   */
  app.delete("/api/v1/end-user/app/:projectId", withNext(disableAppAuth));

  /**
   * Current User Properties
   */
  app.get(
    "/api/v1/end-user/app/:projectId/user-props-config",
    withNext(getAppCurrentUserOpConfig)
  );
  app.post(
    "/api/v1/end-user/app/:projectId/user-props-config",
    withNext(upsertCurrentUserOpConfig)
  );
  app.post(
    "/api/v1/end-user/app/:projectId/user-props",
    withNext(getAppCurrentUserProperties)
  );
}

export function addCodegenRoutes(app: express.Application) {
  app.post("/api/v1/code/resolve-sync", apiAuth, withNext(resolveSync));
  app.post("/api/v1/code/style-config", apiAuth, withNext(genStyleConfig));
  app.post("/api/v1/code/required-packages", withNext(requiredPackages));
  app.post(
    "/api/v1/code/latest-codegen-version",
    withNext(latestCodegenVersion)
  );

  // All project endpoints that are related to code generation
  app.post(
    "/api/v1/projects/:projectId/code/components",
    apiAuth,
    withNext(genCode)
  );
  app.post(
    "/api/v1/projects/:projectId/code/tokens",
    apiAuth,
    withNext(genStyleTokens)
  );
  app.post(
    "/api/v1/projects/:projectId/code/icons",
    apiAuth,
    withNext(genIcons)
  );
  app.post(
    "/api/v1/projects/:projectId/code/meta",
    apiAuth,
    withNext(getProjectMeta)
  );
  app.get("/api/v1/localization/gen-texts", genTranslatableStrings);

  // All endpoints under /loader are cors-enabled
  app.get(
    "/api/v1/loader/code/published",
    cors(),
    apiAuth,
    withNext(buildPublishedLoaderAssets)
  );
  app.get(
    "/api/v1/loader/code/versioned",
    cors(),
    apiAuth,
    withNext(buildVersionedLoaderAssets)
  );
  app.get(
    "/api/v1/loader/code/preview",
    cors(),
    apiAuth,
    withNext(buildLatestLoaderAssets)
  );
  app.get("/api/v1/loader/chunks", cors(), getLoaderChunk);
  app.get(
    "/api/v1/loader/html/published/:projectId/:component",
    cors(),
    apiAuth,
    withNext(buildPublishedLoaderHtml)
  );
  app.get(
    "/api/v1/loader/html/versioned/:projectId/:component",
    cors(),
    apiAuth,
    withNext(buildVersionedLoaderHtml)
  );
  app.get(
    "/api/v1/loader/html/preview/:projectId/:component",
    cors(),
    apiAuth,
    buildLatestLoaderHtml
  );
  app.get(
    "/api/v1/loader/repr-v2/published/:projectId",
    cors(),
    apiAuth,
    withNext(buildPublishedLoaderReprV2)
  );
  app.get(
    "/api/v1/loader/repr-v2/versioned/:projectId",
    cors(),
    apiAuth,
    withNext(buildVersionedLoaderReprV2)
  );
  app.get(
    "/api/v1/loader/repr-v2/preview/:projectId",
    cors(),
    apiAuth,
    buildLatestLoaderReprV2
  );
  app.get(
    "/api/v1/loader/repr-v3/published/:projectId",
    cors(),
    apiAuth,
    withNext(buildPublishedLoaderReprV3)
  );
  app.get(
    "/api/v1/loader/repr-v3/versioned/:projectId",
    cors(),
    apiAuth,
    withNext(buildVersionedLoaderReprV3)
  );
  app.get(
    "/api/v1/loader/repr-v3/preview/:projectId",
    cors(),
    apiAuth,
    withNext(buildLatestLoaderReprV3)
  );

  app.post(
    "/api/v1/loader/code/prefill/:pkgVersionId",
    cors(),
    // intentionally no apiAuth()
    withNext(prefillPublishedLoader)
  );

  app.get("/static/js/loader-hydrate.js", getHydrationScript);
  app.get("/static/js/loader-hydrate.:hash.js", getHydrationScriptVersioned);
}

export function addMainAppServerRoutes(
  app: express.Application,
  config: Config
) {
  // Rate limit for forgetPassword and signUp routes.
  // Currently using in-memory storage, can be improved to use
  // redis/postgres.
  const sensitiveRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 15,
    skip: (req) => {
      const shouldRateLimit =
        config.production || req.get("x-plasmic-test-rate-limit") === "true";
      return !shouldRateLimit;
    },
  });

  app.use((req, res, next) => {
    logger().debug(req.ip);
    next();
  });

  /**
   * Primary app routes.
   */
  app.get("/api/v1/error", () => {
    throw new Error("Raw test error");
  });

  /**
   * Auth Routes
   */
  app.get("/api/v1/auth/csrf", authRoutes.csrf);
  app.post(
    "/api/v1/auth/login",
    sensitiveRateLimiter,
    withNext(authRoutes.login)
  );
  app.post(
    "/api/v1/auth/sign-up",
    sensitiveRateLimiter,
    withNext(authRoutes.signUp)
  );
  app.get("/api/v1/auth/self", authRoutes.self);
  app.post("/api/v1/auth/self", withNext(authRoutes.updateSelf));
  app.delete("/api/v1/auth/self", withNext(authRoutes.deleteSelf));
  app.post(
    "/api/v1/auth/self/password",
    sensitiveRateLimiter,
    withNext(authRoutes.updateSelfPassword)
  );
  app.post("/api/v1/auth/logout", withNext(authRoutes.logout));
  app.post(
    "/api/v1/auth/forgotPassword",
    sensitiveRateLimiter,
    withNext(authRoutes.forgotPassword)
  );
  app.post(
    "/api/v1/auth/resetPassword",
    sensitiveRateLimiter,
    withNext(authRoutes.resetPassword)
  );
  app.post(
    "/api/v1/auth/confirmEmail",
    sensitiveRateLimiter,
    withNext(authRoutes.confirmEmail)
  );
  app.post(
    "/api/v1/auth/sendEmailVerification",
    sensitiveRateLimiter,
    withNext(authRoutes.sendEmailVerification)
  );
  app.get(
    "/api/v1/auth/getEmailVerificationToken",
    authRoutes.getEmailVerificationToken
  );
  app.get("/api/v1/auth/google", authRoutes.googleLogin);
  app.get(
    "/api/v1/oauth2/google/callback",
    withNext(authRoutes.googleCallback)
  );
  app.get("/api/v1/auth/sso/test", authRoutes.isValidSsoEmail);
  app.get("/api/v1/auth/sso/:tenantId/login", authRoutes.ssoLogin);
  app.get(
    "/api/v1/auth/sso/:tenantId/consume",
    withNext(authRoutes.ssoCallback)
  );
  app.get("/api/v1/auth/airtable", authRoutes.airtableLogin);
  app.get("/api/v1/auth/google-sheets", authRoutes.googleSheetsLogin);
  app.get(
    "/api/v1/oauth2/google-sheets/callback",
    authRoutes.googleSheetsCallback
  );
  app.get("/api/v1/oauth2/airtable/callback", authRoutes.airtableCallback);
  app.get("/api/v1/auth/integrations", authRoutes.getUserAuthIntegrations);

  /**
   * Admin Routes
   */
  app.post("/api/v1/admin/user", adminOnly, withNext(adminRoutes.createUser));
  app.post(
    "/api/v1/admin/clone",
    adminOnly,
    withNext(adminRoutes.cloneProject)
  );
  app.post(
    "/api/v1/admin/revert-project-revision",
    adminOnly,
    withNext(adminRoutes.revertProjectRevision)
  );
  app.post(
    "/api/v1/admin/resetPassword",
    adminOnly,
    withNext(adminRoutes.resetPassword)
  );

  app.post(
    "/api/v1/admin/setPassword",
    adminOnly,
    withNext(adminRoutes.setPassword)
  );
  app.post(
    "/api/v1/admin/updateMode",
    adminOnly,
    withNext(adminRoutes.updateSelfAdminMode)
  );
  app.get("/api/v1/admin/users", adminOnly, adminRoutes.listUsers);
  app.get(
    "/api/v1/admin/feature-tiers",
    adminOnly,
    adminRoutes.listAllFeatureTiers
  );
  app.put(
    "/api/v1/admin/feature-tiers",
    adminOnly,
    withNext(adminRoutes.addFeatureTier)
  );
  app.post(
    "/api/v1/admin/change-team-owner",
    adminOnly,
    withNext(adminRoutes.changeTeamOwner)
  );
  app.post(
    "/api/v1/admin/upgrade-personal-team",
    adminOnly,
    withNext(adminRoutes.upgradePersonalTeam)
  );
  app.post(
    "/api/v1/admin/reset-team-trial",
    adminOnly,
    withNext(adminRoutes.resetTeamTrial)
  );
  app.post("/api/v1/admin/teams", adminOnly, withNext(adminRoutes.listTeams));
  app.post(
    "/api/v1/admin/projects",
    adminOnly,
    withNext(adminRoutes.listProjects)
  );
  app.post(
    "/api/v1/admin/workspaces",
    adminOnly,
    withNext(adminRoutes.createWorkspace)
  );
  app.post(
    "/api/v1/admin/delete-project",
    adminOnly,
    withNext(adminRoutes.deleteProject)
  );
  app.delete(
    "/api/v1/admin/delete-project-and-revisions",
    adminOnly,
    withNext(adminRoutes.deleteProjectAndRevisions)
  );
  app.post(
    "/api/v1/admin/restore-project",
    adminOnly,
    withNext(adminRoutes.restoreProject)
  );
  app.post(
    "/api/v1/admin/change-project-owner",
    adminOnly,
    withNext(adminRoutes.updateProjectOwner)
  );
  app.post(
    "/api/v1/admin/login-as",
    adminOnly,
    withNext(adminRoutes.adminLoginAs)
  );
  app.post(
    "/api/v1/admin/deactivate-user",
    adminOnly,
    withNext(adminRoutes.deactivateUser)
  );
  app.post(
    "/api/v1/admin/upgrade-team",
    adminOnly,
    withNext(adminRoutes.upgradeTeam)
  );
  app.get("/api/v1/admin/devflags", adminOnly, adminRoutes.getDevFlagOverrides);
  app.get(
    "/api/v1/admin/devflags/versions",
    adminOnly,
    adminRoutes.getDevFlagVersions
  );
  app.put(
    "/api/v1/admin/devflags",
    adminOnly,
    withNext(adminRoutes.setDevFlagOverrides)
  );
  app.post(
    "/api/v1/admin/upsert-sso",
    adminOnly,
    withNext(adminRoutes.upsertSsoConfig)
  );
  app.get("/api/v1/admin/get-sso", adminOnly, adminRoutes.getSsoByTeam);
  app.post(
    "/api/v1/admin/create-tutorial-db",
    adminOnly,
    withNext(adminRoutes.createTutorialDb)
  );
  app.post(
    "/api/v1/admin/reset-tutorial-db",
    adminOnly,
    withNext(adminRoutes.resetTutorialDb)
  );
  app.get(
    "/api/v1/admin/get-team-by-white-label-name",
    adminOnly,
    adminRoutes.getTeamByWhiteLabelName
  );
  app.post(
    "/api/v1/admin/update-team-white-label-info",
    adminOnly,
    withNext(adminRoutes.updateTeamWhiteLabelInfo)
  );
  app.post(
    "/api/v1/admin/update-team-white-label-name",
    adminOnly,
    withNext(adminRoutes.updateTeamWhiteLabelName)
  );
  app.post(
    "/api/v1/admin/promotion-code",
    adminOnly,
    withNext(adminRoutes.createPromotionCode)
  );
  app.get(
    "/api/v1/admin/app-auth-metrics",
    adminOnly,
    adminRoutes.getAppAuthMetrics
  );
  app.get(
    "/api/v1/admin/project/:projectId/app-meta",
    adminOnly,
    adminRoutes.getProjectAppMeta
  );
  app.get(
    `/api/v1/admin/project/:projectId/rev`,
    adminOnly,
    adminRoutes.getLatestProjectRevision
  );
  app.post(
    `/api/v1/admin/project/:projectId/rev`,
    adminOnly,
    adminRoutes.saveProjectRevisionData
  );
  app.get(
    `/api/v1/admin/pkg-version/data`,
    adminOnly,
    adminRoutes.getPkgVersion
  );
  app.post(
    `/api/v1/admin/pkg-version/:pkgVersionId`,
    adminOnly,
    withNext(adminRoutes.savePkgVersion)
  );

  app.get(
    "/api/v1/admin/teams/:teamId/discourse-info",
    adminOnly,
    adminRoutes.getTeamDiscourseInfo
  );
  app.put(
    "/api/v1/admin/teams/:teamId/sync-discourse-info",
    adminOnly,
    withNext(adminRoutes.syncTeamDiscourseInfo)
  );
  app.post(
    "/api/v1/admin/teams/:teamId/send-support-welcome-email",
    adminOnly,
    withNext(adminRoutes.sendTeamSupportWelcomeEmail)
  );
  app.get(
    "/api/v1/admin/project-branches-metadata/:projectId",
    adminOnly,
    adminRoutes.getProjectBranchesMetadata
  );

  /**
   * Self routes
   */
  app.get("/api/v1/app-config", getAppConfig);
  app.get("/api/v1/app-ctx", withNext(getAppCtx));

  /**
   * Pkg routes
   */
  app.get("/api/v1/latest-bundle-version", getLatestBundleVersion);
  app.get("/api/v1/plume-pkg", withNext(getPlumePkg));
  app.get("/api/v1/plume-pkg/versions", getPlumePkgVersionStrings);
  app.get("/api/v1/plume-pkg/latest", getLatestPlumePkg);
  app.get("/api/v1/pkgs/:pkgId", withNext(getPkgVersion));
  app.post(
    "/api/v1/projects/:projectId/revert-to-revision",
    revertProjectToRevision
  );
  app.get(
    "/api/v1/projects/:projectId/revs/unpublished",
    listUnpublishedProjectRevisions
  );
  app.get("/api/v1/projects/:projectId/revs/:revisionId", getProjectRevision);
  app.get("/api/v1/pkgs/projectId/:projectId", getPkgVersionByProjectId);
  app.get(
    "/api/v1/pkgs/:pkgId/versions-without-data",
    listPkgVersionsWithoutData
  );
  app.post("/api/v1/pkgs/:pkgId/update-version", updatePkgVersion);

  /**
   * Project routes
   */
  app.get(
    "/api/v1/projects",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    withNext(listProjects)
  );
  app.post("/api/v1/projects", withNext(createProject));
  app.post(
    "/api/v1/projects/create-project-with-hostless-packages",
    withNext(createProjectWithHostlessPackages)
  );
  app.post("/api/v1/projects/:projectId/clone", withNext(cloneProject));
  app.post(
    "/api/v1/templates/:projectId/clone",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    withNext(clonePublishedTemplate)
  );
  // Import includes capabilities to keep the project id, allow data source op issuing,
  // set project domains, thus we need to be more careful with it.
  app.post(
    "/api/v1/projects/import",
    adminOrDevelopmentEnvOnly,
    withNext(importProject)
  );
  app.get(
    "/api/v1/projects/:projectId/meta",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    getProjectMeta
  );
  app.put(
    "/api/v1/projects/:projectId/meta",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    updateProjectMeta
  );
  app.get("/api/v1/projects/:projectId/branches", listBranchesForProject);
  app.post(
    "/api/v1/projects/:projectId/branches",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    withNext(createBranch)
  );
  app.put(
    "/api/v1/projects/:projectId/branches/:branchId",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    withNext(updateBranch)
  );
  app.delete(
    "/api/v1/projects/:projectId/branches/:branchId",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    withNext(deleteBranch)
  );
  app.post(
    "/api/v1/projects/:projectId/main-branch-protection",
    withNext(setMainBranchProtection)
  );
  app.get("/api/v1/projects/:projectBranchId", withNext(getProjectRev));
  app.get(
    "/api/v1/projects/:projectId/revision-without-data",
    getProjectRevWithoutData
  );
  app.get("/api/v1/project-data/:projectId", adminOnly, getFullProjectData);
  app.put("/api/v1/projects/:projectId", updateProject);
  app.delete(
    "/api/v1/projects/:projectId",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    withNext(deleteProject)
  );
  app.put("/api/v1/projects/:projectId/revert-to-version", revertToVersion);
  app.put("/api/v1/projects/:projectId/update-host", withNext(updateHostUrl));
  app.delete("/api/v1/projects/:projectId/perm", withNext(removeSelfPerm));
  app.get("/api/v1/projects/:projectId/updates", getModelUpdates);
  app.post(
    "/api/v1/projects/:projectId/create-pkg",
    withNext(createPkgByProjectId)
  );
  app.get("/api/v1/projects/:projectId/pkg", getPkgByProjectId);
  app.post(
    "/api/v1/projects/:projectId/publish",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    publishProject
  );
  app.post(
    "/api/v1/projects/:projectId/next-publish-version",
    withNext(computeNextProjectVersion)
  );
  app.get(
    "/api/v1/projects/:projectId/pkgs/:pkgVersionId/status",
    getPkgVersionPublishStatus
  );
  app.post(
    "/api/v1/projects/:projectBranchId/revisions/:revision",
    saveProjectRev
  );
  app.post("/api/v1/projects/:projectId/merge", tryMergeBranch);
  app.post(
    "/api/v1/projects/:projectId/code/project-sync-metadata",
    apiAuth,
    withNext(getProjectSyncMetadata)
  );
  app.post(
    "/api/v1/projects/:projectId",
    cors(),
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    apiAuth,
    updateProjectData
  );
  app.get(
    "/api/v1/projects/:projectId/versions",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    withNext(listProjectVersionsWithoutData)
  );

  addInternalRoutes(app);

  addCommentsRoutes(app);

  /**
   * Teams / Users routes
   */
  app.get("/api/v1/users/:userIds", getUsersById);
  app.get(
    "/api/v1/teams",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    withNext(teamRoutes.listTeams)
  );
  app.post(
    "/api/v1/teams",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    withNext(teamRoutes.createTeam)
  );
  app.get(
    "/api/v1/teams/:teamId",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    teamRoutes.getTeamById
  );
  app.get(
    "/api/v1/teams/:teamId/meta",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    teamRoutes.getTeamMeta
  );
  app.get("/api/v1/teams/:teamId/projects", teamRoutes.getTeamProjects);
  app.get(
    "/api/v1/teams/:teamId/workspaces",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    teamRoutes.getTeamWorkspaces
  );
  app.put("/api/v1/teams/:teamId", withNext(teamRoutes.updateTeam));
  app.delete(
    "/api/v1/teams/:teamId",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    withNext(teamRoutes.deleteTeam)
  );
  app.post("/api/v1/teams/purgeUsers", withNext(teamRoutes.purgeUsersFromTeam));
  app.post("/api/v1/teams/:teamId/join", teamRoutes.joinTeam);
  app.post(
    "/api/v1/grant-revoke",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    teamRoutes.changeResourcePermissions
  );
  app.get("/api/v1/feature-tiers", teamRoutes.listCurrentFeatureTiers);
  app.get("/api/v1/teams/:teamId/tokens", teamRoutes.listTeamTokens);
  app.post(
    "/api/v1/teams/:teamId/tokens",
    withNext(teamRoutes.createTeamToken)
  );
  app.delete(
    "/api/v1/teams/:teamId/tokens/:token",
    withNext(teamRoutes.revokeTeamToken)
  );
  app.post(
    "/api/v1/teams/:teamId/prepare-support-urls",
    withNext(teamRoutes.prepareTeamSupportUrls)
  );

  /**
   * Workspaces routes.
   */
  app.post(
    "/api/v1/workspaces",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    createWorkspace
  );
  app.get("/api/v1/workspaces/:workspaceId", getWorkspace);
  app.get("/api/v1/personal-workspace", getPersonalWorkspace);
  app.put("/api/v1/workspaces/:workspaceId", updateWorkspace);
  app.delete(
    "/api/v1/workspaces/:workspaceId",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    withNext(deleteWorkspace)
  );

  app.get(
    "/api/v1/workspaces",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    withNext(getWorkspaces)
  );

  /**
   * Project webhooks.
   */
  app.post(
    "/api/v1/projects/:projectId/trigger-webhook",
    withNext(triggerProjectWebhook)
  );
  app.get("/api/v1/projects/:projectId/webhooks", getProjectWebhooks);
  app.post(
    "/api/v1/projects/:projectId/webhooks",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    withNext(createProjectWebhook)
  );
  app.put(
    "/api/v1/projects/:projectId/webhooks/:webhookId",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    withNext(updateProjectWebhook)
  );
  app.delete(
    "/api/v1/projects/:projectId/webhooks/:webhookId",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    withNext(deleteProjectWebhook)
  );
  app.get(
    "/api/v1/projects/:projectId/webhooks/events",
    getProjectWebhookEvents
  );

  app.post("/api/v1/fmt-code", withNext(fmtCode));
  app.get("/api/v1/clip/:clipId", getClip);
  app.put("/api/v1/clip/:clipId", withNext(putClip));

  app.get("/api/v1/settings/apitokens", apiTokenRoutes.listTokens);
  app.put("/api/v1/settings/apitokens", withNext(apiTokenRoutes.createToken));
  app.delete(
    "/api/v1/settings/apitokens/:token",
    withNext(apiTokenRoutes.revokeToken)
  );
  app.put(
    "/api/v1/settings/apitokens/emit/:initToken",
    withNext(apiTokenRoutes.emitToken)
  );

  app.post(
    "/api/v1/mail/subscribe",
    cors(),
    withNext(mailingListRoutes.subscribe)
  );

  /**
   * Fake data for demos and cypress tests.
   */
  app.get("/api/v1/demodata/tweets", getFakeTweets);
  app.get("/api/v1/demodata/tasks", getFakeTasks);
  app.get("/api/v1/demodata/plans", getFakePlans);
  app.get("/api/v1/demodata/blurbs", getFakeBlurbs);
  app.get("/api/v1/demodata/posts", getFakePosts);
  app.get("/api/v1/demodata/testimonials", getFakeTestimonials);

  /**
   * Discourse SSO
   */
  app.get("/api/v1/auth/discourse-connect", discourseConnect);

  /**
   * GitHub integration.
   */
  app.post("/api/v1/github/connect", withNext(connectGithubInstallations));
  app.get("/api/v1/github/data", githubData);
  app.get(
    "/api/v1/github/detect/:owner/:repo",
    withNext(detectOptionsFromDirectory)
  );
  app.get("/api/v1/github/branches", githubBranches);
  app.post("/api/v1/github/repos", withNext(setupNewGithubRepo));
  app.put("/api/v1/github/repos", withNext(setupExistingGithubRepo));

  /**
   * Project repositories.
   */
  app.get(
    "/api/v1/projects/:projectId/repositories",
    withNext(getProjectRepositories)
  );
  app.post("/api/v1/project_repositories", withNext(addProjectRepository));
  app.delete(
    "/api/v1/project_repositories/:projectRepositoryId",
    withNext(deleteProjectRepository)
  );
  app.post(
    "/api/v1/project_repositories/:projectRepositoryId/action",
    withNext(fireGitAction)
  );
  app.get(
    "/api/v1/project_repositories/:projectRepositoryId/latest-run",
    getLatestWorkflowRun
  );
  app.get(
    "/api/v1/project_repositories/:projectRepositoryId/runs/:workflowRunId",
    getGitWorkflowJob
  );

  /**
   * SVG utilities.
   */
  app.post("/api/v1/process-svg", withNext(processSvgRoute));

  /**
   * Trusted hosts
   */
  app.get(
    "/api/v1/hosts",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    getTrustedHostsForSelf
  );
  app.post(
    "/api/v1/hosts",
    safeCast<RequestHandler>(authRoutes.teamApiUserAuth),
    withNext(addTrustedHost)
  );
  app.delete("/api/v1/hosts/:trustedHostId", withNext(deleteTrustedHost));

  app.post(
    "/api/v1/image/upload",
    fileUpload({
      limits: {
        files: 1,
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    }),
    withNext(uploadImage)
  );

  /**
   * CMS
   */
  addCmsEditorRoutes(app);
  addCmsPublicRoutes(app);

  /**
   * White label user management
   */
  addWhiteLabelRoutes(app);

  /**
   * Promotion routes
   */
  app.get("/api/v1/promo-code/:promoCodeId", cors(), getPromotionCodeById);

  /**
   * Analytics
   */
  addAnalyticsRoutes(app);

  addDataSourceRoutes(app);
  addIntegrationsRoutes(app);

  /**
   * App auth
   */
  addAppAuthRoutes(app);

  /**
   * End user management
   */
  addEndUserManagementRoutes(app);

  if (typeof jest === "undefined") {
    // Do not create the interval in unit tests, because it keeps running and
    // breaks later tests.
    const checkAndNotifyUpdates = () => {
      spawn(
        getConnection().transaction((entMgr) =>
          checkAndNofityHostlessVersion(new DbMgr(entMgr, SUPER_USER))
        )
      );
    };

    checkAndNotifyUpdates();
    setInterval(() => checkAndNotifyUpdates(), 1000 * 60);
  }
}

/**
 * Handle common types of errors that are thrown by DbMgr, transforming them
 * into ApiErrors that have proper HTTP codes.
 *
 * Really, we only want this to run after our normal route handlers, and not
 * transform errors thrown in (e.g.) our passport.deserializeUser handler.
 */
function addEndErrorHandlers(app: express.Application) {
  // This transforms certain known errors into proper response codes and JSON.
  // This is only called if there was previously a next(error).
  app.use(
    safeCast<ErrorRequestHandler>(
      async (
        origErr: Error,
        req: Request,
        res: Response,
        _next: NextFunction
      ) => {
        // Too noisy in CI to print AuthError all the time
        if (!(origErr instanceof AuthError)) {
          logger().error("ERROR!", origErr);
        }
        if (res.headersSent || res.writableEnded) {
          logError(origErr, "Tried to edit closed response");
          return;
        }
        const err = isApiError(origErr) ? origErr : transformErrors(origErr);
        if (isApiError(err)) {
          res
            .status(err.statusCode)
            .json({ error: { ...err, message: err.message } });
        } else {
          res.status(500).json({ error: { message: "Internal Server Error" } });
        }
      }
    )
  );
}

function addNotFoundHandler(app: express.Application) {
  app.use((req: Request, res: Response, _next: NextFunction) => {
    _next(new NotFoundError("Not Found"));
  });
}

export async function createApp(
  name: string,
  config: Config,
  addRoutes: (app: express.Application) => void,
  addCleanRoutes?: (app: express.Application) => void,
  opts?: {
    skipSession: boolean;
  }
): Promise<{ app: express.Application }> {
  const app = express();

  app.set("port", config.port || process.env.BACKEND_PORT || 3004);
  app.set("name", name);

  await getConnection().transaction(async (entMgr) => {
    const dbMgr = new DbMgr(entMgr, SUPER_USER);
    await ensureDevFlags(dbMgr);
    await setupPassport(dbMgr, config, DEVFLAGS);
  });

  // Sentry setup needs to be first
  addSentry(app, config);

  if (config.production) {
    app.enable("trust proxy");
  }

  addCleanRoutes?.(app);

  addMiddlewares(app, config, opts);

  if (!config.production) {
    addStaticRoutes(app);
  }

  addRoutes(app);

  // Only error middlewares will be called after this
  // Add ERROR handlers
  //

  // If we've fallen to here, then there was no route match;
  // throw a 404. We explicitly handle it here instead of letting
  // Express use its default 404 handler, so that we can handle
  // this error like any other error -- specifically, we will
  // clean up and reject the current transaction upon a 404 in
  // addEndErrorHandlers().
  addNotFoundHandler(app);

  // Sentry error handler must go after routes
  addSentryError(app, config);

  // On error, rollback transactions
  addEndErrorHandlers(app);

  if (!config.production) {
    app.use(errorHandler());
  }

  const pruneCache = () => {
    const conn = getConnection();
    spawn(prunePartialRevCache(conn.manager));
    spawn(pruneOldBundleBackupsCache(conn.manager));
  };

  // Call it before `setInterval` so there's no initial delay
  pruneCache();

  // Prune old cache every 2 hours
  cron.schedule("0 */2 * * *", () => {
    logger().info("Pruning cache");
    pruneCache();
  });

  // Don't leak infra info
  app.disable("x-powered-by");
  logger().info(
    `Starting server with heap memory ${
      v8.getHeapStatistics().total_available_size / 1024 / 1024
    }MB`
  );

  trackPostgresPool(name);

  return { app };
}

function corsPreflight() {
  const corsHandler = cors({
    // set access-control-max-age to 30 days, so the browser doesn't even
    // issue preflight requests for a while
    maxAge: 30 * 24 * 60 * 60,
    allowedHeaders: "*",
  });

  const handler: express.RequestHandler = safeCast<RequestHandler>(
    async (req, res, next) => {
      res.set(
        "Cache-Control",
        `max-age=${30 * 24 * 60 * 60}, s-maxage=${30 * 24 * 60 * 60}`
      );
      corsHandler(req, res, next);
    }
  );
  return handler;
}

export function makeExpressSessionMiddleware(config: Config) {
  return session({
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30-day sessions
      ...(config.production && {
        // Allow to be embedded into an iframe in prod.
        // It's also possible to do this in dev, but it's
        // a huge pain because secure:true must accompany
        // sameSite:none, which means you'd have to run
        // all the dev servers in https mode.
        sameSite: "none",
        secure: true,
      }),
    },
    genid: function (req: any) {
      const userId = req.user?.id ?? "";
      return `${userId}-${nanoid(24)}`;
    },
    // Trust the proxy in deciding whether we are in an https
    // connection. Because app server sits behind nginx, which
    // handles the https and holds just a plain http connection
    // to the app server, we need to trust that nginx is passing
    // along the right header to let us know that this is indeed
    // https, so that we can set secure cookies above.
    proxy: true,
    resave: false,
    // saveUninitialized (true by default) forces new session
    // creation and sends Set-Cookie response header, even if the
    // session was not modified.
    // We set saveUninitialized: false to avoid:
    //  1) creating unnecessary sessions
    //  2) sending Set-Cookie response header, which makes responses
    //     uncacheable for some CDNs
    // The above is mainly relevant for API endpoints that originate
    // from our CLI or SDKs, where CSRF protection is disabled.
    // Normal web app usage is unaffected (a new session will be
    // created on the first visit), since lusca.csrf will immediately
    // set a CSRF token in the session.
    saveUninitialized: false,
    secret: config.sessionSecret,
    store: new TypeormStore({
      // Don't clean up expired sessions for now till we figure out
      // why there's a spike here
      cleanupLimit: 0,
      // By not using a subquery, maybe less likely for deadlock
      limitSubquery: false,
      onError: () => {},
      //ttl: 86400,
    }).connect(getConnection().getRepository(ExpressSession)),
  });
}
