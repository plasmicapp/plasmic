import * as Sentry from "@sentry/node";
import * as bodyParser from "body-parser";
import errorHandler from "errorhandler";
import { execa } from "execa";
import express from "express";
import "express-async-errors";
import promMetrics from "express-prom-bundle";
import { NextFunction, Request, Response } from "express-serve-static-core";
import * as fs from "fs";
import morgan from "morgan";
import v8 from "v8";
import { renderBundle } from "./renderer";

export interface ServerConfig {
  production: boolean;
  sentryDSN?: string;
}

const DEFAULT_CONFIG: ServerConfig = {
  production: process.env.NODE_ENV === "production",
};

export function loadConfig(file?: string): ServerConfig {
  const config = Object.assign({}, DEFAULT_CONFIG);
  if (file && fs.existsSync(file)) {
    console.log("Loading config from file: ", file);
    Object.assign(config, JSON.parse(fs.readFileSync(file).toString()));
  }

  return config;
}

function addSentry(app: express.Application, config: ServerConfig) {
  if (!config.sentryDSN) {
    return;
  }
  console.log("Initializing Sentry with DSN:", config.sentryDSN);
  Sentry.init({
    dsn: config.sentryDSN,
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
    ],
    // We recommend adjusting this value in production, or using tracesSampler
    // for finer control
    tracesSampleRate: 0,
  });
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

function addSentryError(app: express.Application, config: ServerConfig) {
  if (!config.sentryDSN) {
    return;
  }

  // Copied from @sentry: https://github.com/getsentry/sentry-javascript/blob/master/packages/node/src/handlers.ts
  const getStatusCodeFromResponse = (error: any): number => {
    const statusCode =
      error.status ||
      error.statusCode ||
      error.status_code ||
      (error.output && error.output.statusCode);
    return statusCode ? parseInt(statusCode as string, 10) : 500;
  };

  /** Returns true if response code is internal server error */
  const defaultShouldHandleError = (error: any): boolean => {
    const status = getStatusCodeFromResponse(error);
    return status >= 500;
  };

  const shouldHandleError = (error) => {
    return defaultShouldHandleError(error);
  };

  app.use(Sentry.Handlers.errorHandler({ shouldHandleError }));
}

function addMiddlewares(app: express.Application) {
  app.use(morgan("combined"));
  app.use(
    promMetrics({
      customLabels: {
        route: null,
        url: null,
      },
      includeMethod: true,
      includeStatusCode: true,
      includePath: true,
      transformLabels: (labels, req) => {
        labels.route = req.route?.path;
        labels.url = req.originalUrl;
      },
      promClient: {
        collectDefaultMetrics: {},
      },
    })
  );

  // Parse body further down to prevent unauthorized users from incurring large parses.
  app.use(bodyParser.json({ limit: "400mb" }));
  app.use(bodyParser.urlencoded({ extended: true }));
}

export async function renderBundleSandboxed(
  args: Parameters<typeof renderBundle>[0]
) {
  const cmd = `node -r esbuild-register src/renderer.ts`;
  if (process.env.DISABLE_BWRAP === "1") {
    const { stdout } = await execa("node", [
      ...cmd.split(/\s+/g).slice(1),
      JSON.stringify(args),
    ]);
    return { html: stdout };
  } else {
    const bwrapArgs = process.env.BWRAP_ARGS || "";
    const { stdout } = await execa(`bwrap`, [
      ...`--unshare-user --unshare-pid --unshare-ipc --unshare-uts --unshare-cgroup --ro-bind /lib /lib --ro-bind /usr /usr --ro-bind /etc /etc --ro-bind /run /run ${bwrapArgs} --chdir ${process.cwd()} ${cmd}`.split(
        /\s+/g
      ),
      JSON.stringify(args),
    ]);
    return { html: stdout };
  }
}

function addRoutes(app: express.Application) {
  app.use((req, res, next) => {
    console.log(req.ip);
    next();
  });

  /**
   * Primary app routes.
   */
  app.post(
    "/api/v1/render",
    withNext(async (req, res) => {
      const result = renderBundleSandboxed(req.body);
      res.json(result);
    })
  );
}

function withNext(
  f: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    f(req, res, next).then(
      () => next(),
      (err) => next(err)
    );
  };
}

function addEndErrorHandlers(app: express.Application) {
  // This transforms certain known errors into proper response codes and JSON.
  // This is only called if there was previously a next(error).
  app.use(
    async (err: Error, req: Request, res: Response, next: NextFunction) => {
      if ((err as any).statusCode) {
        res
          .status((err as any).statusCode)
          .json({ error: { ...err, message: err.message } });
      } else {
        next(err);
      }
    }
  );
}

export async function createApp(
  config: ServerConfig
): Promise<express.Application> {
  const app = express();

  app.set("port", process.env.REACT_RENDERER_PORT || 3010);

  // Sentry setup needs to be first
  addSentry(app, config);

  if (config.production) {
    app.enable("trust proxy");
  }

  addMiddlewares(app);

  addRoutes(app);

  // Sentry error handler must go first
  addSentryError(app, config);

  addEndErrorHandlers(app);

  if (!config.production) {
    app.use(errorHandler());
  }

  // Don't leak infra info
  app.disable("x-powered-by");

  console.log(
    `Starting React-rendering server with heap memory ${
      v8.getHeapStatistics().total_available_size / 1024 / 1024
    }MB`
  );

  return app;
}
