import findupSync from "findup-sync";
import { getParsedPackageJson } from "./npm-utils";

export function detectTypescript() {
  return findupSync("tsconfig.json");
}

export function detectNextJs() {
  if (
    findupSync("next.config.js") ||
    findupSync(".next") ||
    findupSync("next-env.d.ts")
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
  const nextConfigPath = findupSync("next.config.js");
  if (!nextConfigPath) {
    return false;
  }

  return require(nextConfigPath)?.experimental?.appDir || false;
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
