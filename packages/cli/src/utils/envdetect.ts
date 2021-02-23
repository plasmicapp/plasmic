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

export function detectGatsby() {
  return findupSync("gatsby-config.js");
}

export function detectCreateReactApp() {
  try {
    const packageJsonContent = getParsedPackageJson();
    return "react-scripts" in packageJsonContent.dependencies;
  } catch {
    return false;
  }
}
