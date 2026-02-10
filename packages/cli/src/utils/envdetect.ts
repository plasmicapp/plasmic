import findupSync from "findup-sync";
import semver from "semver";
import { getParsedPackageJson } from "./npm-utils";

export function detectTypescript() {
  return findupSync("tsconfig.json");
}

export function detectNextJs() {
  if (
    findupSync([
      "next.config.js",
      "next.config.ts",
      "next.config.mjs",
      ".next/",
      "next-env.d.ts",
    ])
  ) {
    return true;
  }

  try {
    const packageJsonContent = getParsedPackageJson();
    return (
      packageJsonContent.scripts.build === "next build" ||
      "next" in packageJsonContent.dependencies
    );
  } catch {
    return false;
  }
}

export function detectNextJsAppDir() {
  if (!detectNextJs()) {
    return false;
  }

  const nextConfigPath = findupSync("next.config.js");
  // Legacy Next.js (<13.4): explicit opt-in
  if (nextConfigPath && require(nextConfigPath)?.experimental?.appDir) {
    return true;
  }

  if (!findupSync("app")) {
    return false;
  }

  if (!findupSync("pages")) {
    return true;
  }

  // Both app/ and pages/ exist - need to check Next.js version
  try {
    const packageJson = getParsedPackageJson();
    const nextVersion: string | undefined = packageJson.dependencies?.next;
    if (nextVersion) {
      if (nextVersion === "latest") {
        return true;
      }
      const coercedVersion = semver.coerce(nextVersion);
      // For Next.js >= 13.4, app dir is the default
      if (coercedVersion && semver.gte(coercedVersion, "13.4.0")) {
        return true;
      }
    }
  } catch {
    // Can't read package.json - can't determine if App Router is enabled
    return false;
  }

  return false;
}

export function detectNextJsVersion(): string | undefined {
  try {
    const packageJson = getParsedPackageJson();
    const nextVersion: string | undefined = packageJson.dependencies?.next;
    if (!nextVersion) {
      return undefined;
    }
    const major = semver.coerce(nextVersion)?.major;
    return major != null ? String(major) : undefined;
  } catch {
    return undefined;
  }
}

export function detectGatsby() {
  return findupSync("gatsby-config.js") || findupSync("gatsby-config.ts");
}

export function detectCreateReactApp() {
  try {
    const packageJsonContent = getParsedPackageJson();
    return "react-scripts" in packageJsonContent.dependencies;
  } catch {
    return false;
  }
}

export function detectTanStackApp() {
  try {
    const packageJsonContent = getParsedPackageJson();
    return "@tanstack/react-router" in packageJsonContent.dependencies;
  } catch {
    return false;
  }
}
