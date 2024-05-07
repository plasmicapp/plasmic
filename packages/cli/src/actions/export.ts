import { promises as fs } from "fs";
import { keyBy, snakeCase } from "lodash";
import path from "path";
import { CommonArgs } from "..";
import { PlasmicApi, ProjectBundle } from "../api";
import {
  fixAllImportStatements,
  formatAsLocal,
  maybeConvertTsxToJsx,
} from "../utils/code-utils";
import {
  CodeConfig,
  findConfigFile,
  I18NConfig,
  ImagesConfig,
  PlasmicConfig,
  StyleConfig,
} from "../utils/config-utils";
import { getContext, getCurrentOrDefaultAuth } from "../utils/get-context";
import { tuple } from "../utils/lang-utils";
import { DEFAULT_GLOBAL_CONTEXTS_NAME } from "./sync-global-contexts";
import { ensureImageAssetContents } from "./sync-images";
import { DEFAULT_SPLITS_PROVIDER_NAME } from "./sync-splits-provider";

export interface ExportArgs extends CommonArgs {
  projects: readonly string[];
  platform: "" | "react" | "nextjs" | "gatsby";
  codeLang: "" | "ts" | "js";
  styleScheme: "" | "css" | "css-modules";
  imagesScheme: "" | "inlined" | "files";
  i18NKeyScheme: "" | I18NConfig["keyScheme"];
  i18NTagPrefix: "" | I18NConfig["tagPrefix"];

  skipFormatting?: boolean;

  outDir: string;
}

export async function exportProjectsCli(opts: ExportArgs): Promise<void> {
  if (!opts.outDir) {
    opts.outDir = "./";
  }
  if (!opts.baseDir) opts.baseDir = process.cwd();
  let configFile =
    opts.config || findConfigFile(opts.baseDir, { traverseParents: true });
  let context = configFile
    ? await getContext(opts, { enableSkipAuth: true })
    : undefined;
  const projectConfigMap = keyBy(
    context?.config.projects ?? [],
    (p) => p.projectId
  );
  const projectIdToToken = new Map(
    [...(context?.config.projects ?? [])]
      .filter((p) => p.projectApiToken)
      .map((p) => tuple(p.projectId, p.projectApiToken))
  );
  const projectWithVersion = opts.projects.map((p) => {
    const [projectIdToken, versionRange] = p.split("@");
    const [projectId, projectApiToken] = projectIdToken.split(":");
    return {
      projectId,
      branchName: projectConfigMap[projectId]?.projectBranchName ?? "main",
      versionRange:
        versionRange || projectConfigMap[projectId]?.version || "latest",
      componentIdOrNames: undefined, // Get all components!
      projectApiToken: projectApiToken || projectIdToToken.get(projectId),
      indirect: false,
    };
  });

  const auth = await getCurrentOrDefaultAuth(opts);
  const api = new PlasmicApi(auth);
  const result = await exportProjects(api, {
    projects: projectWithVersion.map((p) => ({
      id: p.projectId,
      token: p.projectApiToken,
      branchName: p.branchName,
      version: p.versionRange,
    })),
    platform: opts.platform || "react",
    codeOpts: { lang: opts.codeLang || "ts" },
    stylesOpts: { scheme: opts.styleScheme || "css-modules" },
    imageOpts: { scheme: opts.imagesScheme || "files" },
    i18nOpts: opts.i18NKeyScheme
      ? { keyScheme: opts.i18NKeyScheme, tagPrefix: opts.i18NTagPrefix }
      : undefined,
  });

  const extx = opts.codeLang === "js" ? "jsx" : "tsx";

  const writeProj = async (bundle: ProjectBundle) => {
    await ensureImageAssetContents(bundle.imageAssets);
    const outPath = path.resolve(opts.outDir);
    const promises: Promise<void>[] = [];
    const writeFile = (fileName: string, content: string | Buffer) => {
      if (typeof content === "string" && !opts.skipFormatting) {
        content = formatAsLocal(content, fileName, opts.outDir);
      }
      const projectName = snakeCase(bundle.projectConfig.projectName);
      promises.push(
        (async () => {
          await fs.mkdir(path.join(outPath, projectName), { recursive: true });
          await fs.writeFile(
            path.join(outPath, projectName, fileName),
            content
          );
        })()
      );
    };
    for (const comp of bundle.components) {
      writeFile(comp.skeletonModuleFileName, comp.skeletonModule);
      writeFile(comp.cssFileName, comp.cssRules);
    }
    for (const icon of bundle.iconAssets) {
      writeFile(icon.fileName, icon.module);
    }
    for (const gv of bundle.globalVariants) {
      writeFile(gv.contextFileName, gv.contextModule);
    }

    for (const img of bundle.imageAssets) {
      writeFile(img.fileName, Buffer.from(img.blob, "base64"));
    }

    writeFile(bundle.projectConfig.cssFileName, bundle.projectConfig.cssRules);
    if (bundle.projectConfig.globalContextBundle) {
      writeFile(
        `${DEFAULT_GLOBAL_CONTEXTS_NAME}.${extx}`,
        bundle.projectConfig.globalContextBundle.contextModule
      );
    }

    if (bundle.projectConfig.splitsProviderBundle) {
      writeFile(
        `${DEFAULT_SPLITS_PROVIDER_NAME}.${extx}`,
        bundle.projectConfig.splitsProviderBundle.module
      );
    }

    if (bundle.projectConfig.reactWebExportedFiles) {
      for (const file of bundle.projectConfig.reactWebExportedFiles) {
        writeFile(file.fileName, file.content);
      }
    }

    await Promise.all(promises);
  };

  await Promise.all(result.map((res) => writeProj(res)));

  await fixAllImportStatements(
    {
      configFile: "",
      lockFile: "",
      rootDir: path.resolve(opts.outDir),
      absoluteSrcDir: path.resolve(opts.outDir),
      config: {
        platform: opts.platform || "react",
        srcDir: "./",
        defaultPlasmicDir: "./",
        code: {
          lang: opts.codeLang || "ts",
          scheme: "blackbox",
          reactRuntime: "classic",
        },
        images: {
          scheme: opts.imagesScheme || "files",
        },
        style: {
          scheme: opts.styleScheme || "css-modules",
          defaultStyleCssFilePath: "",
        },
        tokens: {} as any,
        globalVariants: {
          variantGroups: result.flatMap((bundle) => {
            const projectName = snakeCase(bundle.projectConfig.projectName);
            return bundle.globalVariants.map((gv) => ({
              id: gv.id,
              name: gv.name,
              projectId: bundle.projectConfig.projectId,
              contextFilePath: `./${projectName}/${gv.contextFileName}`,
            }));
          }),
        },
        projects: result.map((bundle) => {
          const projectName = snakeCase(bundle.projectConfig.projectName);
          return {
            projectId: bundle.projectConfig.projectId,
            projectName: bundle.projectConfig.projectName,
            version: "latest",
            cssFilePath: `${projectName}/${bundle.projectConfig.cssFileName}`,
            globalContextsFilePath: bundle.projectConfig.globalContextBundle
              ? `${projectName}/${DEFAULT_GLOBAL_CONTEXTS_NAME}.${extx}`
              : "",
            splitsProviderFilePath: bundle.projectConfig.splitsProviderBundle
              ? `${projectName}/${DEFAULT_SPLITS_PROVIDER_NAME}.${extx}`
              : "",
            components: bundle.components.map((comp) => ({
              id: comp.id,
              name: comp.componentName,
              projectId: bundle.projectConfig.projectId,
              type: "managed",
              importSpec: {
                modulePath: `${projectName}/${comp.skeletonModuleFileName}`,
              },
              renderModuleFilePath: `${projectName}/${comp.skeletonModuleFileName}`,
              cssFilePath: `${projectName}/${comp.cssFileName}`,
              scheme: "blackbox",
              componentType: `${comp.isPage ? "page" : "component"}`,
              plumeType: comp.plumeType,
            })),
            codeComponents: bundle.codeComponentMetas.map((comp) => ({
              id: comp.id,
              name: comp.name,
              displayName: comp.displayName,
              componentImportPath: comp.importPath,
              helper: comp.helper,
            })),
            customFunctionMetas: (bundle.customFunctionMetas ?? []).map(
              (meta) => ({
                id: meta.id,
                name: meta.name,
                importPath: meta.importPath,
                defaultExport: meta.defaultExport,
                namespace: meta.namespace ?? null,
              })
            ),
            icons: bundle.iconAssets.map((icon) => ({
              id: icon.id,
              name: icon.name,
              moduleFilePath: `${projectName}/${icon.fileName}`,
            })),
            images: bundle.imageAssets.map((image) => ({
              id: image.id,
              name: image.name,
              filePath: `${projectName}/${image.fileName}`,
            })),
            indirect: false,
          };
        }),
        wrapPagesWithGlobalContexts: true,
      },
      lock: {} as any,
      auth: {} as any,
      api: api,
      cliArgs: {} as any,
    },
    opts.outDir
  );
}

interface ExportOpts {
  projects: {
    id: string;
    token?: string;
    branchName?: string;
    version?: string;
  }[];
  platform?: PlasmicConfig["platform"];
  imageOpts?: ImagesConfig;
  stylesOpts?: Omit<StyleConfig, "defaultStyleCssFilePath">;
  i18nOpts?: I18NConfig;
  codeOpts?: Omit<CodeConfig, "scheme" | "reactRuntime">;
}

async function exportProjects(api: PlasmicApi, opts: ExportOpts) {
  api.attachProjectIdsAndTokens(
    opts.projects.map((proj) => ({
      projectId: proj.id,
      projectApiToken: proj.token,
    }))
  );

  const versionResolution = await api.resolveSync(
    opts.projects.map((p) => ({
      projectId: p.id,
      branchName: p.branchName ?? "main",
      versionRange: p.version,
      componentIdOrNames: undefined,
      projectApiToken: p.token,
      indirect: false,
    })),
    true
  );

  const versionsToSync = [
    ...versionResolution.dependencies,
    ...versionResolution.projects,
  ];

  const result = await Promise.all(
    versionsToSync.map(async (v) => {
      return api.exportProject(v.projectId, v.branchName, {
        platform: opts.platform ?? "react",
        platformOptions: {},
        version: v.version,
        imageOpts: opts.imageOpts ?? {
          scheme: "files",
        },
        stylesOpts: {
          defaultStyleCssFilePath: "",
          scheme: "css-modules",
          ...opts.stylesOpts,
        },
        i18nOpts: opts.i18nOpts,
        codeOpts: opts.codeOpts ?? { lang: "ts" },
        indirect: v.indirect,
        wrapPagesWithGlobalContexts: true,
      });
    })
  );

  if (opts.codeOpts?.lang === "js") {
    for (const proj of result) {
      for (const comp of proj.components) {
        [comp.skeletonModuleFileName, comp.skeletonModule] =
          maybeConvertTsxToJsx(
            comp.skeletonModuleFileName,
            comp.skeletonModule,
            "."
          );
      }
      for (const icon of proj.iconAssets) {
        [icon.fileName, icon.module] = maybeConvertTsxToJsx(
          icon.fileName,
          icon.module,
          "."
        );
      }
      for (const gv of proj.globalVariants) {
        [gv.contextFileName, gv.contextModule] = maybeConvertTsxToJsx(
          gv.contextFileName,
          gv.contextModule,
          "."
        );
      }
      if (proj.projectConfig.globalContextBundle) {
        const res = maybeConvertTsxToJsx(
          `${DEFAULT_GLOBAL_CONTEXTS_NAME}.tsx`,
          proj.projectConfig.globalContextBundle.contextModule,
          "."
        );
        proj.projectConfig.globalContextBundle.contextModule = res[1];
      }
      if (proj.projectConfig.splitsProviderBundle) {
        const res = maybeConvertTsxToJsx(
          `${DEFAULT_SPLITS_PROVIDER_NAME}.tsx`,
          proj.projectConfig.splitsProviderBundle.module,
          "."
        );
        proj.projectConfig.splitsProviderBundle.module = res[1];
      }
    }
  }

  return result;
}
