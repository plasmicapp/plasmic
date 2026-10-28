import { addEndErrorHandlers } from "@/wab/server/AppServer";
import { logger } from "@/wab/server/observability";
import { DataSourceError } from "@/wab/shared/data-sources-meta/data-sources";
import { stampIgnoreError } from "@/wab/shared/error-handling";
import express from "express";
import { once } from "node:events";

it.each([
  {
    error: stampIgnoreError(new Error("no available server")),
    status: 500,
    ignored: true,
  },
  {
    error: stampIgnoreError(
      new Error("An API key is required to connect to Airtable"),
    ),
    status: 500,
    ignored: true,
  },
  {
    error: stampIgnoreError(new DataSourceError("ECONNRESET")),
    status: 500,
    ignored: true,
  },
  {
    error: stampIgnoreError(new DataSourceError("upstream unavailable", 503)),
    status: 503,
    ignored: true,
  },
  {
    error: stampIgnoreError(new DataSourceError("bad query", 400)),
    status: 400,
    ignored: true,
  },
  { error: new Error("internal secret"), status: 500, ignored: false },
  {
    error: new DataSourceError("unexpected failure", 503),
    status: 503,
    ignored: false,
  },
])(
  "returns $status for $error.message (ignored: $ignored)",
  async ({ error, status, ignored }) => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const logError = vi
      .spyOn(logger, "error")
      .mockImplementation(() => undefined);
    const app = express();
    app.get("/", (_req, _res, next) => next(error));
    addEndErrorHandlers(app);
    const server = app.listen(0, "127.0.0.1");
    try {
      await once(server, "listening");
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Expected TCP address");
      }
      const response = await fetch(`http://127.0.0.1:${address.port}/`);
      expect(response.status).toBe(status);
      const body = (await response.json()).error;
      expect(body.__plasmicIgnoreError).toBe(ignored ? true : undefined);
      expect(body.message).toBe(
        status === 500 ? "Internal Server Error" : error.message,
      );
      expect(ignored ? warn : logError).toHaveBeenCalledWith(
        ignored ? "Request failed" : "ERROR!",
        error,
      );
      expect(ignored ? logError : warn).not.toHaveBeenCalled();
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
);
