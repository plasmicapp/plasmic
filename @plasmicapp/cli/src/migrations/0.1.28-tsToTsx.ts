import { PlasmicConfig } from "../utils/config-utils";

import fs from "fs";
import path from "upath";
import glob from "glob";
import L from "lodash";
import { MigrateContext } from "./migrations";
import { findSrcDirPath } from "../utils/file-utils";
import { logger } from "../deps";

export function tsToTsx(config: PlasmicConfig, context: MigrateContext) {
  const srcDir = context.absoluteSrcDir;
  const allFiles = glob.sync(`${srcDir}/**/*.+(ts)`, {
    ignore: [`${srcDir}/**/node_modules/**/*`]
  });
  const existingFiles = L.groupBy(allFiles, f => path.basename(f));
  config.projects.forEach(project => {
    project.components.forEach(c => {
      if (c.renderModuleFilePath.endsWith("ts")) {
        const relFilePath = findSrcDirPath(
          context.absoluteSrcDir,
          c.renderModuleFilePath,
          existingFiles
        );
        const absFilePath = path.join(context.absoluteSrcDir, relFilePath);
        if (fs.existsSync(absFilePath)) {
          logger.info(`rename file from ${absFilePath} to ${absFilePath}x`);
          fs.renameSync(absFilePath, `${absFilePath}x`);
        }
        c.renderModuleFilePath = `${c.renderModuleFilePath}x`;
      }
    });
  });
  return config;
}
