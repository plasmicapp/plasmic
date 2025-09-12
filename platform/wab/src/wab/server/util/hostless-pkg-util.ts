import { logger } from "@/wab/server/observability";
import fs from "fs";
import { memoize } from "lodash";
import path from "path";

/**
 * Looks up the npm package version used for the argument hostless npm package
 * in loader-bundle-env.
 */
export const getHostlessPackageNpmVersion = memoize(
  function getHostlessPackageNpmVersion(pkg: string) {
    try {
      const nodeModuleDir = path.resolve(
        path.join(process.cwd(), "..", "loader-bundle-env", "node_modules", pkg)
      );
      const packageJsonFile = path.join(nodeModuleDir, "package.json");
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonFile).toString()
      );
      return packageJson.version;
    } catch (err) {
      logger().error(
        `Error encountered while deriving hostless package npm version for ${pkg}`,
        err
      );
      return undefined;
    }
  }
);
