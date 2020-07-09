import path from "upath";
import L, { merge } from "lodash";
import { CommonArgs } from "..";
import {
  getContext,
  updateConfig,
  PlasmicContext,
  ProjectConfig
} from "../utils/config-utils";
import {
  buildBaseNameToFiles,
  writeFileContent,
  findSrcDirPath,
  readFileContent,
  stripExtension,
  fixAllFilePaths
} from "../utils/file-utils";
import {
  ProjectBundle,
  ComponentBundle,
  GlobalVariantBundle,
  ProjectMetaBundle,
  StyleConfigResponse,
  IconBundle,
  AppServerError
} from "../api";
import {
  fixAllImportStatements,
  tsxToJsx,
  formatJs
} from "../utils/code-utils";
import { upsertStyleTokens } from "./sync-styles";
import { flatMap } from "../utils/lang-utils";
import {
  warnLatestReactWeb,
  getCliVersion,
  findInstalledVersion
} from "../utils/npm-utils";
import {
  ComponentInfoForMerge,
  mergeFiles,
  makeCachedProjectSyncDataProvider
} from "@plasmicapp/code-merger";
import { options } from "yargs";
import { syncProjectIconAssets } from "./sync-icons";

export interface SyncArgs extends CommonArgs {
  projects: readonly string[];
  components: readonly string[];
  onlyExisting: boolean;
  forceOverwrite: boolean;
  newComponentScheme?: "blackbox" | "direct";
  appendJsxOnMissingBase?: boolean;
}

function maybeConvertTsxToJsx(fileName: string, content: string) {
  if (fileName.endsWith("tsx")) {
    const jsFileName = stripExtension(fileName) + ".jsx";
    const jsContent = formatJs(tsxToJsx(content));
    return [jsFileName, jsContent];
  }
  return [fileName, content];
}

export async function syncProjects(opts: SyncArgs) {
  const context = getContext(opts);
  fixAllFilePaths(context);
  const projectIds =
    opts.projects.length > 0
      ? opts.projects
      : context.config.projects.map(p => p.projectId);
  if (projectIds.length === 0) {
    console.error(
      "Don't know which projects to sync; please specify via --projects"
    );
    process.exit(1);
  }

  const reactWebVersion = findInstalledVersion(
    context,
    "@plasmicapp/react-web"
  );

  const results = await Promise.all(
    projectIds.map(projectId => {
      const existingProject = context.config.projects.find(
        p => p.projectId === projectId
      );
      const existingCompScheme: Array<[string, "blackbox" | "direct"]> = (
        existingProject?.components || []
      ).map(c => [c.id, c.scheme]);
      return context.api.projectComponents(
        projectId,
        getCliVersion(),
        reactWebVersion,
        opts.newComponentScheme || context.config.code.scheme,
        existingCompScheme,
        opts.components.length === 0 ? undefined : opts.components
      );
    })
  );

  if (context.config.code.lang === "js") {
    results.forEach(project => {
      project.components.forEach(c => {
        [c.renderModuleFileName, c.renderModule] = maybeConvertTsxToJsx(
          c.renderModuleFileName,
          c.renderModule
        );
        [c.skeletonModuleFileName, c.skeletonModule] = maybeConvertTsxToJsx(
          c.skeletonModuleFileName,
          c.skeletonModule
        );
      });
      project.iconAssets.forEach(icon => {
        [icon.fileName, icon.module] = maybeConvertTsxToJsx(
          icon.fileName,
          icon.module
        );
      });
      project.globalVariants.forEach(gv => {
        [gv.contextFileName, gv.contextModule] = maybeConvertTsxToJsx(
          gv.contextFileName,
          gv.contextModule
        );
      });
    });
  }
  // Materialize scheme into each component config.
  context.config.projects.forEach(p =>
    p.components.forEach(c => {
      if (!c.scheme) {
        c.scheme = context.config.code.scheme;
      }
    })
  );

  syncStyleConfig(context, await context.api.genStyleConfig());

  const config = context.config;
  const knownComponentIds = new Set(
    flatMap(config.projects, p => p.components.map(c => c.id))
  );
  const shouldSyncComponents = (id: string, name: string) => {
    if (opts.onlyExisting) {
      // If explicitly told to only sync known components, then check
      return knownComponentIds.has(id);
    }

    // Otherwise, we sync all components; if the user had specified --components, we
    // have already passed that up to the server, and the server should've only sent
    // down a filtered set of components already.
    return true;
  };

  for (const [projectId, projectBundle] of L.zip(projectIds, results) as [
    string,
    ProjectBundle
  ][]) {
    syncGlobalVariants(context, projectId, projectBundle.globalVariants);
    const componentBundles = projectBundle.components.filter(bundle =>
      shouldSyncComponents(bundle.id, bundle.componentName)
    );
    await syncProjectConfig(
      context,
      projectBundle.projectConfig,
      componentBundles,
      projectBundle.iconAssets,
      opts.forceOverwrite,
      !!opts.appendJsxOnMissingBase
    );
    upsertStyleTokens(context, projectBundle.usedTokens);
  }

  // Write the new ComponentConfigs to disk
  updateConfig(context, {
    projects: config.projects,
    globalVariants: config.globalVariants,
    tokens: config.tokens,
    style: config.style
  });

  // Now we know config.components are all correct, so we can go ahead and fix up all the import statements
  fixAllImportStatements(context);

  await warnLatestReactWeb(context);
}

async function syncProjectComponents(
  context: PlasmicContext,
  project: ProjectConfig,
  componentBundles: ComponentBundle[],
  forceOverwrite: boolean,
  appendJsxOnMissingBase: boolean
) {
  const allCompConfigs = L.keyBy(project.components, c => c.id);
  for (const bundle of componentBundles) {
    const {
      renderModule,
      skeletonModule,
      cssRules,
      renderModuleFileName,
      skeletonModuleFileName,
      cssFileName,
      componentName,
      id,
      scheme,
      nameInIdToUuid
    } = bundle;
    console.log(
      `Syncing component ${componentName} [${project.projectId}/${id}]`
    );
    let compConfig = allCompConfigs[id];
    const isNew = !compConfig;
    if (isNew) {
      // This is the first time we're syncing this component
      compConfig = {
        id,
        name: componentName,
        type: "managed",
        projectId: project.projectId,
        renderModuleFilePath: path.join(
          context.config.defaultPlasmicDir,
          L.snakeCase(`${project.projectName}`),
          renderModuleFileName
        ),
        importSpec: { modulePath: skeletonModuleFileName },
        cssFilePath: path.join(
          context.config.defaultPlasmicDir,
          L.snakeCase(project.projectName),
          cssFileName
        ),
        scheme: scheme as "blackbox" | "direct"
      };
      allCompConfigs[id] = compConfig;
      project.components.push(allCompConfigs[id]);

      // Because it's the first time, we also generate the skeleton file.
      writeFileContent(context, skeletonModuleFileName, skeletonModule, {
        force: false
      });
    } else {
      // This is an existing component.
      const editedFile = readFileContent(
        context,
        compConfig.importSpec.modulePath
      );
      if (scheme === "direct") {
        // merge code!
        const componentByUuid = new Map<string, ComponentInfoForMerge>();

        componentByUuid.set(compConfig.id, {
          editedFile,
          newFile: skeletonModule,
          newNameInIdToUuid: new Map(nameInIdToUuid)
        });
        const mergedFiles = await mergeFiles(
          componentByUuid,
          project.projectId,
          makeCachedProjectSyncDataProvider(async (projectId, revision) => {
            try {
              return await context.api.projectSyncMetadata(
                projectId,
                revision,
                true
              );
            } catch (e) {
              if (
                e instanceof AppServerError &&
                /revision \d+ not found/.test(e.message)
              ) {
                throw e;
              } else {
                console.log(e.messag);
                process.exit(1);
              }
            }
          }),
          () => {},
          appendJsxOnMissingBase
        );
        const merged = mergedFiles?.get(compConfig.id);
        if (merged) {
          writeFileContent(context, compConfig.importSpec.modulePath, merged, {
            force: true
          });
        } else {
          if (!forceOverwrite) {
            console.error(
              `Cannot merge ${compConfig.importSpec.modulePath}. If you just switched the code scheme for the component from blackbox to direct, use --force-overwrite option to force the switch.`
            );
            process.exit(1);
          } else {
            console.log(
              `Overwrite ${compConfig.importSpec.modulePath} despite merge failure`
            );
            writeFileContent(
              context,
              compConfig.importSpec.modulePath,
              skeletonModule,
              {
                force: true
              }
            );
          }
        }
      } else if (/\/\/\s*plasmic-managed-jsx\/\d+/.test(editedFile)) {
        if (forceOverwrite) {
          writeFileContent(
            context,
            compConfig.importSpec.modulePath,
            skeletonModule,
            {
              force: true
            }
          );
        } else {
          console.warn(
            `file ${compConfig.importSpec.modulePath} is likely in "direct" scheme. If you intend to switch the code scheme from direct to blackbox, use --force-overwrite option to force the switch.`
          );
        }
      }
    }
    writeFileContent(context, compConfig.renderModuleFilePath, renderModule, {
      force: !isNew
    });
    writeFileContent(context, compConfig.cssFilePath, cssRules, {
      force: !isNew
    });
  }
}

function syncStyleConfig(
  context: PlasmicContext,
  response: StyleConfigResponse
) {
  const expectedPath =
    context.config.style.defaultStyleCssFilePath ||
    path.join(
      context.config.defaultPlasmicDir,
      response.defaultStyleCssFileName
    );
  context.config.style.defaultStyleCssFilePath = expectedPath;
  writeFileContent(context, expectedPath, response.defaultStyleCssRules, {
    force: true
  });
}

function syncGlobalVariants(
  context: PlasmicContext,
  projectId: string,
  bundles: GlobalVariantBundle[]
) {
  const allVariantConfigs = L.keyBy(
    context.config.globalVariants.variantGroups,
    c => c.id
  );
  for (const bundle of bundles) {
    console.log(
      `Syncing global variant ${bundle.name} [${projectId}/${bundle.id}]`
    );
    let variantConfig = allVariantConfigs[bundle.id];
    const isNew = !variantConfig;
    if (isNew) {
      variantConfig = {
        id: bundle.id,
        name: bundle.name,
        projectId,
        contextFilePath: path.join(
          context.config.defaultPlasmicDir,
          bundle.contextFileName
        )
      };
      allVariantConfigs[bundle.id] = variantConfig;
      context.config.globalVariants.variantGroups.push(variantConfig);
    }

    writeFileContent(
      context,
      variantConfig.contextFilePath,
      bundle.contextModule,
      { force: !isNew }
    );
  }
}

async function syncProjectConfig(
  context: PlasmicContext,
  pc: ProjectMetaBundle,
  componentBundles: ComponentBundle[],
  iconBundles: IconBundle[],
  forceOverwrite: boolean,
  appendJsxOnMissingBase: boolean
) {
  let project = context.config.projects.find(c => c.projectId === pc.projectId);
  const defaultCssFilePath = path.join(
    context.config.defaultPlasmicDir,
    L.snakeCase(pc.projectName),
    pc.cssFileName
  );
  const isNew = !project;
  if (!project) {
    project = {
      projectId: pc.projectId,
      projectName: pc.projectName,
      cssFilePath: defaultCssFilePath,
      components: [],
      icons: []
    };
    context.config.projects.push(project);
  } else {
    project.projectName = pc.projectName;
  }

  if (!project.cssFilePath) {
    project.cssFilePath = defaultCssFilePath;
  }

  writeFileContent(context, project.cssFilePath, pc.cssRules, {
    force: !isNew
  });
  await syncProjectComponents(
    context,
    project,
    componentBundles,
    forceOverwrite,
    appendJsxOnMissingBase
  );
  syncProjectIconAssets(context, project, iconBundles);
}
