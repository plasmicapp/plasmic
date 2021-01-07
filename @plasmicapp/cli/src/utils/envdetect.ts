import { existsBuffered } from "./file-utils";
import { getParsedPackageJson } from "./npm-utils";

export function detectTypescript() {
  return existsBuffered("tsconfig.json");
}

export function detectNextJs() {
  if (
    existsBuffered("next.config.js") ||
    existsBuffered(".next") ||
    existsBuffered("next-env.d.ts")
  ) {
    return true;
  }

  try {
    const packageJsonContent = getParsedPackageJson();
    return packageJsonContent.scripts.build === "next build";
  } catch {
    return false;
  }
}

export function detectGatsby() {
  return existsBuffered("gatsby-config.js");
}

export function detectCreateReactApp() {
  try {
    const packageJsonContent = getParsedPackageJson();
    return "react-scripts" in packageJsonContent.dependencies;
  } catch {
    return false;
  }
}
