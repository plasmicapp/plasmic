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

export const LOADER_NEXTJS_TEMPLATES = [
  // latest (v2) loader has a peer dependency on Next >= 14
  { loaderVersion: "latest", template: "template-pages", nextVersion: "^14" },
  // Next.js 12 forces moduleResolution:"node" in tsconfig during build, which
  // is deprecated in TS6. ignoreDeprecations silences it for this old combo.
  {
    loaderVersion: "^1",
    template: "template-pages",
    nextVersion: "^12",
    tsConfigOverrides: { ignoreDeprecations: "6.0" },
  },
  {
    loaderVersion: "latest",
    template: "template-app",
    reactVersion: "latest",
    nextVersion: "^15",
  },
];

export const LOADER_NEXTJS_VERSIONS = [
  { loaderVersion: "latest", reactVersion: "latest", nextVersion: "latest" },
  { loaderVersion: "^1", reactVersion: "latest", nextVersion: "latest" },
  // Before PlasmicLinkProvider / usePlasmicLink is added.
  // Next.js 12 forces moduleResolution:"node" in tsconfig during build, which
  // is deprecated in TS6. ignoreDeprecations silences it for this old combo.
  {
    loaderVersion: "1.0.287",
    reactVersion: "^18",
    nextVersion: "^12",
    tsConfigOverrides: { ignoreDeprecations: "6.0" },
  },
];

export const LOADER_REACT_VERSIONS = [
  // latest (v2) loader has a peer dependency on React >= 18
  // this configuration is used by CRA templates. CRA is deprecated and does not support React 19
  { reactVersion: "^18", loaderReactVersion: "latest" },
];

export const LOADER_NEXTJS_VERSIONS_EXHAUSTIVE = [
  ...LOADER_NEXTJS_VERSIONS,
  { loaderVersion: "latest", reactVersion: "^18", nextVersion: "^13" },
  { loaderVersion: "latest", reactVersion: "^18", nextVersion: "^14" },
  { loaderVersion: "latest", reactVersion: "^18", nextVersion: "^15" },
];

function maybeSwapWithDockerLocalhost(value: string | undefined) {
  if (value && process.env["WITHIN_DOCKER"]) {
    return value.replace("localhost", "host.docker.internal");
  }
  return value;
}
