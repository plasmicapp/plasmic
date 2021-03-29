import env from "./staticConfig";

// The location of the package.json changes after compiling.
export const packageJson: { version: string } = require("../../package.json");

export const sentryDsn = env.SENTRY_DSN;
