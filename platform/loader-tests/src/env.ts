import process from "process";

export const PNPM_CACHE_DIR = "/tmp/.loader-pnpm-store";

const DEFAULT_ENV = {
  NPM_CONFIG_REGISTRY: "https://registry.npmjs.org",
  NPM_CONFIG_CACHE: "",
  WAB_HOST: "http://127.0.0.1:3003",
  WAB_USER_EMAIL: "admin@admin.example.com",
  WAB_USER_PASSWORD: "!53kr3tz!",
} as const;

export function getEnvVar(variable: keyof typeof DEFAULT_ENV): string {
  const value = process.env[variable] ?? DEFAULT_ENV[variable];

  return variable === "WAB_HOST" || variable === "NPM_CONFIG_REGISTRY"
    ? (maybeSwapWithDockerLocalhost(value) as string)
    : value;
}

export const LOADER_NEXTJS_VERSIONS = [
  { loaderVersion: "latest", nextVersion: "latest" },
  // Before PlasmicLinkProvider / usePlasmicLink is added
  { loaderVersion: "1.0.287", nextVersion: "^12" },
];

export const LOADER_NEXTJS_VERSIONS_EXHAUSTIVE = [
  ...LOADER_NEXTJS_VERSIONS,
  { loaderVersion: "^1", nextVersion: "^13" },
  { loaderVersion: "^1", nextVersion: "^14" },
];

function maybeSwapWithDockerLocalhost(value: string | undefined) {
  if (value && process.env["WITHIN_DOCKER"]) {
    return value.replace("localhost", "host.docker.internal");
  }
  return value;
}
