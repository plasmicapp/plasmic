import L from "lodash";
import path from "upath";
import {
  PlasmicConfig,
  PlasmicContext,
  getContext,
  updateConfig,
  ProjectConfig
} from "../utils/config-utils";
import { ProjectIconsResponse, IconBundle } from "../api";
import { writeFileContent, fixAllFilePaths } from "../utils/file-utils";
import { CommonArgs } from "..";

export interface SyncIconsArgs extends CommonArgs {
  projects: readonly string[];
}

export async function syncIcons(opts: SyncIconsArgs) {
  const context = getContext(opts);
  fixAllFilePaths(context);

  const api = context.api;
  const config = context.config;

  const projectIds =
    opts.projects.length > 0
      ? opts.projects
      : context.config.projects.map(p => p.projectId);

  const results = await Promise.all(
    projectIds.map(projectId => api.projectIcons(projectId))
  );
  for (const [projectId, resp] of L.zip(projectIds, results) as [
    string,
    ProjectIconsResponse
  ][]) {
    let project = config.projects.find(p => p.projectId === projectId);
    if (!project) {
      project = {
        projectId,
        projectName: "",
        version: "latest",
        cssFilePath: "",
        components: [],
        icons: []
      };
      config.projects.push(project);
    }
    syncProjectIconAssets(context, project, resp.icons);
  }

  updateConfig(context, config);
}

export function syncProjectIconAssets(
  context: PlasmicContext,
  project: ProjectConfig,
  iconBundles: IconBundle[]
) {
  if (!project.icons) {
    project.icons = [];
  }
  const knownIconConfigs = L.keyBy(project.icons, i => i.id);
  for (const bundle of iconBundles) {
    console.log(
      `Syncing icon ${bundle.name} [${project.projectId}/${bundle.id}]`
    );
    let iconConfig = knownIconConfigs[bundle.id];
    const isNew = !iconConfig;
    if (isNew) {
      iconConfig = {
        id: bundle.id,
        name: bundle.name,
        moduleFilePath: path.join(
          context.config.defaultPlasmicDir,
          L.snakeCase(`${project.projectName}`),
          bundle.fileName
        )
      };
      knownIconConfigs[bundle.id] = iconConfig;
      project.icons.push(iconConfig);
    }

    writeFileContent(context, iconConfig.moduleFilePath, bundle.module, {
      force: !isNew
    });
  }
}
