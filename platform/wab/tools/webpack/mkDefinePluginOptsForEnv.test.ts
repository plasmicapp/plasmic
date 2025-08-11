import {
  OPTIONAL_VAR,
  REQUIRED_VAR,
  mkDefinePluginOptsForEnv,
} from "./mkDefinePluginOptsForEnv";

describe("mkDefinePluginOptsForEnv", () => {
  let originalProcessEnv: NodeJS.ProcessEnv | undefined;

  beforeEach(() => {
    // process.env values set in initTests.js, unset for this test
    originalProcessEnv = process.env;
    process.env = {
      NODE_ENV: "development",
      STRIPE_PUBLISHABLE_KEY: "stripe_publishable_key",
    };
  });

  afterEach(() => {
    if (originalProcessEnv) {
      process.env = originalProcessEnv;
    }
  });

  it("works in development without some optional vars", () => {
    expect(
      mkDefinePluginOptsForEnv({
        NODE_ENV: REQUIRED_VAR,
        COMMITHASH: "123456",
        PUBLICPATH: "/",
        AMPLITUDE_API_KEY: OPTIONAL_VAR,
        INTERCOM_APP_ID: OPTIONAL_VAR,
        POSTHOG_API_KEY: OPTIONAL_VAR,
        POSTHOG_HOST: OPTIONAL_VAR,
        POSTHOG_REVERSE_PROXY_HOST: OPTIONAL_VAR,
        SENTRY_DSN: OPTIONAL_VAR,
        SENTRY_ORG_ID: OPTIONAL_VAR,
        SENTRY_PROJECT_ID: OPTIONAL_VAR,
        STRIPE_PUBLISHABLE_KEY: OPTIONAL_VAR,
      })
    ).toEqual({
      "process.env.NODE_ENV": '"development"',
      "process.env.COMMITHASH": '"123456"',
      "process.env.PUBLICPATH": '"/"',
      "process.env.AMPLITUDE_API_KEY": undefined,
      "process.env.INTERCOM_APP_ID": undefined,
      "process.env.POSTHOG_API_KEY": undefined,
      "process.env.POSTHOG_HOST": undefined,
      "process.env.POSTHOG_REVERSE_PROXY_HOST": undefined,
      "process.env.SENTRY_DSN": undefined,
      "process.env.SENTRY_ORG_ID": undefined,
      "process.env.SENTRY_PROJECT_ID": undefined,
      "process.env.STRIPE_PUBLISHABLE_KEY": '"stripe_publishable_key"',
    });
  });
  it("throws in development without some optional vars", () => {
    process.env.NODE_ENV = "production";
    expect(() =>
      mkDefinePluginOptsForEnv({
        NODE_ENV: REQUIRED_VAR,
        COMMITHASH: "123456",
        PUBLICPATH: "/",
        AMPLITUDE_API_KEY: OPTIONAL_VAR,
        INTERCOM_APP_ID: OPTIONAL_VAR,
        POSTHOG_API_KEY: OPTIONAL_VAR,
        POSTHOG_HOST: OPTIONAL_VAR,
        POSTHOG_REVERSE_PROXY_HOST: OPTIONAL_VAR,
        SENTRY_DSN: OPTIONAL_VAR,
        SENTRY_ORG_ID: OPTIONAL_VAR,
        SENTRY_PROJECT_ID: OPTIONAL_VAR,
        STRIPE_PUBLISHABLE_KEY: OPTIONAL_VAR,
      })
    ).toThrow("production build");
  });
  it("works in production with all optional vars", () => {
    process.env.NODE_ENV = "production";
    process.env.AMPLITUDE_API_KEY = "amplitude_api_key";
    process.env.INTERCOM_APP_ID = "intercom_app_id";
    process.env.POSTHOG_API_KEY = "posthog_api_key";
    process.env.POSTHOG_HOST = "posthog_host";
    process.env.POSTHOG_REVERSE_PROXY_HOST = "posthog_reverse_proxy_host";
    process.env.SENTRY_DSN = "sentry_dsn";
    process.env.SENTRY_ORG_ID = "sentry_org_id";
    process.env.SENTRY_PROJECT_ID = "sentry_project_id";
    process.env.STRIPE_PUBLISHABLE_KEY = "stripe_publishable_key";
    expect(
      mkDefinePluginOptsForEnv({
        NODE_ENV: REQUIRED_VAR,
        COMMITHASH: "123456",
        PUBLICPATH: "/",
        AMPLITUDE_API_KEY: OPTIONAL_VAR,
        INTERCOM_APP_ID: OPTIONAL_VAR,
        POSTHOG_API_KEY: OPTIONAL_VAR,
        POSTHOG_HOST: OPTIONAL_VAR,
        POSTHOG_REVERSE_PROXY_HOST: OPTIONAL_VAR,
        SENTRY_DSN: OPTIONAL_VAR,
        SENTRY_ORG_ID: OPTIONAL_VAR,
        SENTRY_PROJECT_ID: OPTIONAL_VAR,
        STRIPE_PUBLISHABLE_KEY: OPTIONAL_VAR,
      })
    ).toEqual({
      "process.env.NODE_ENV": '"production"',
      "process.env.COMMITHASH": '"123456"',
      "process.env.PUBLICPATH": '"/"',
      "process.env.AMPLITUDE_API_KEY": '"amplitude_api_key"',
      "process.env.INTERCOM_APP_ID": '"intercom_app_id"',
      "process.env.POSTHOG_API_KEY": '"posthog_api_key"',
      "process.env.POSTHOG_HOST": '"posthog_host"',
      "process.env.POSTHOG_REVERSE_PROXY_HOST": '"posthog_reverse_proxy_host"',
      "process.env.SENTRY_DSN": '"sentry_dsn"',
      "process.env.SENTRY_ORG_ID": '"sentry_org_id"',
      "process.env.SENTRY_PROJECT_ID": '"sentry_project_id"',
      "process.env.STRIPE_PUBLISHABLE_KEY": '"stripe_publishable_key"',
    });
  });
  it("throws if process.env value is found", () => {
    expect(() =>
      mkDefinePluginOptsForEnv({
        NODE_ENV: "development", // already set in process.env
        COMMITHASH: "123456",
        PUBLICPATH: "/",
        AMPLITUDE_API_KEY: OPTIONAL_VAR,
        INTERCOM_APP_ID: OPTIONAL_VAR,
        POSTHOG_API_KEY: OPTIONAL_VAR,
        POSTHOG_HOST: OPTIONAL_VAR,
        POSTHOG_REVERSE_PROXY_HOST: OPTIONAL_VAR,
        SENTRY_DSN: OPTIONAL_VAR,
        SENTRY_ORG_ID: OPTIONAL_VAR,
        SENTRY_PROJECT_ID: OPTIONAL_VAR,
        STRIPE_PUBLISHABLE_KEY: OPTIONAL_VAR,
      })
    ).toThrow("found");
  });
  it("throws if required process.env value is missing", () => {
    expect(() =>
      mkDefinePluginOptsForEnv({
        NODE_ENV: REQUIRED_VAR,
        COMMITHASH: "123456",
        PUBLICPATH: REQUIRED_VAR, // missing in process.env
        AMPLITUDE_API_KEY: OPTIONAL_VAR,
        INTERCOM_APP_ID: OPTIONAL_VAR,
        POSTHOG_API_KEY: OPTIONAL_VAR,
        POSTHOG_HOST: OPTIONAL_VAR,
        POSTHOG_REVERSE_PROXY_HOST: OPTIONAL_VAR,
        SENTRY_DSN: OPTIONAL_VAR,
        SENTRY_ORG_ID: OPTIONAL_VAR,
        SENTRY_PROJECT_ID: OPTIONAL_VAR,
        STRIPE_PUBLISHABLE_KEY: OPTIONAL_VAR,
      })
    ).toThrow("missing");
  });
});
