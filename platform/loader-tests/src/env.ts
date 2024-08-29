import process from "process";

const DEFAULT_ENV = {
  NPM_REGISTRY: "https://registry.npmjs.org",
  WAB_HOST: "http://127.0.0.1:3003",
  WAB_USER_EMAIL: "admin@example.com",
  WAB_USER_PASSWORD: "!53kr3tz!",
};

type EnvVar = keyof typeof DEFAULT_ENV;

export function getEnvVar(variable: EnvVar) {
  let value = process.env[variable] ?? DEFAULT_ENV[variable];
  if (variable === "WAB_HOST" || variable === "NPM_REGISTRY") {
    value = maybeSwapWithDockerLocalhost(value);
  }
  return value;
}

// TODO: can only run next@^12 right now because we're using
// node14; need to upgrade to at least node16 to use next@^13
export const LOADER_NEXTJS_VERSIONS = [
  { loaderVersion: "latest", nextVersion: "^12" },
  // Before PlasmicLinkProvider / usePlasmicLink is added
  { loaderVersion: "1.0.287", nextVersion: "^12" },
];

export const LOADER_NEXTJS_VERSIONS_EXHAUSTIVE = [
  ...LOADER_NEXTJS_VERSIONS,
  // ...LOADER_NEXTJS_VERSIONS.map((x) => ({...x, nextVersion: "^12"}))
];

function maybeSwapWithDockerLocalhost(value: string) {
  if (process.env["WITHIN_DOCKER"]) {
    return value.replace("localhost", "host.docker.internal");
  }
  return value;
}
