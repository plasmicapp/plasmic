import {
  checkEsbuildFatalError,
  transformBundlerErrors,
  uploadErrorFiles,
} from "@/wab/server/loader/error-handler";
import { makeGlobalContextsProviderFileName } from "@/wab/server/loader/module-writer";
import { withSpan } from "@/wab/server/util/apm-util";
import {
  CodegenOutputBundle,
  ComponentReference,
} from "@/wab/server/workers/codegen";
import {
  LoaderBundlingError,
  LoaderDeprecatedVersionError,
} from "@/wab/shared/ApiErrors/errors";
import { VariantGroupType } from "@/wab/shared/Variants";
import { FontUsage, makeGoogleFontUrl } from "@/wab/shared/codegen/fonts";
import { ActiveSplit } from "@/wab/shared/codegen/splits";
import {
  ComponentExportOutput,
  PageMetadata,
} from "@/wab/shared/codegen/types";
import { ensure, withoutNils } from "@/wab/shared/common";
import esbuild, { Plugin as EsbuildPlugin, Metafile } from "esbuild";
import { promises as fs } from "fs";
import { glob } from "glob";
import { flatMap, kebabCase, sortBy } from "lodash";
import path from "path";

export interface ComponentMeta {
  id: string;
  displayName: string;
  usedComponents: string[];
  projectId: string;
  name: string;
  renderFile: string;
  skeletonFile: string;
  cssFile: string;
  path: string | undefined;
  isPage: boolean;
  plumeType?: string;
  entry: string;
  isCode?: boolean;
  pageMetadata?: PageMetadata;
  metadata: { [key: string]: string };
  serverQueriesExecFuncFileName?: string;
}

export interface GlobalGroupMeta {
  id: string;
  projectId: string;
  name: string;
  type: VariantGroupType;
  contextFile: string;
}

export interface FontMeta {
  url: string;
}

export interface ProjectMeta {
  id: string;
  teamId?: string;
  indirect: boolean;
  name: string;
  version: string;
  remoteFonts: FontMeta[];
  globalContextsProviderFileName: string;
}

export interface LoaderBundleOutput {
  modules:
    | (CodeModule | AssetModule)[] // version <= 2
    | {
        // version > 2
        browser: (CodeModule | AssetModule)[];
        server: (CodeModule | AssetModule)[];
      };
  external: string[];
  components: ComponentMeta[];
  globalGroups: GlobalGroupMeta[];
  projects: ProjectMeta[];
  activeSplits: ActiveSplit[];
  // Bundle key for loading chunks
  bundleKey: string | null;
  // Store this configuration here so we can easily change it
  deferChunksByDefault: boolean;
  disableRootLoadingBoundaryByDefault: boolean;
}

export interface CodeModule {
  fileName: string;
  code: string;
  imports: string[];
  type: "code";
}

export interface AssetModule {
  fileName: string;
  source: string;
  type: "asset";
}

type BundleOpts = {
  platform: "react" | "nextjs" | "gatsby";
  mode: "production" | "development";
  loaderVersion: number;
  browserOnly: boolean;
};

const RE_RENDERER_FILE = /\/render__[^./]*\.tsx/g;

function componentEntrypoint(c: ComponentExportOutput) {
  return c.isPage ? c.renderModuleFileName : c.skeletonModuleFileName;
}

async function bundleModulesEsbuild(
  dir: string,
  codegenOutputs: CodegenOutputBundle[],
  componentDeps: Record<string, string[]>,
  opts: BundleOpts
) {
  // First we build the javascript, which we need to build separately for browser
  // and for node (if so requested).
  const targets = opts.browserOnly
    ? (["browser"] as const)
    : (["node", "browser"] as const);

  const metafiles: Record<string, Metafile> = {};

  for (const target of targets) {
    // We want to use `splitting: true`, which means esbuild will try to extract
    // code shared by different entrypoints into module chunks that can be reused
    // by different entrypoints.  However, splitting today only works if the target
    // is esm, so we first build as esm, and then we convert esm to cjs
    const outDirEsm = path.join(dir, `dist-esbuild-esm-${target}`);
    const outRes = await esbuild.build({
      // entryPoints are the files that we may want to load explicitly via loader.
      entryPoints: [
        "root-provider.tsx",
        // Each component entry point
        ...codegenOutputs.flatMap((o) =>
          o.components
            // We don't consider code component as entry points as we consider that the user
            // will import them directly from the code component, and not from the loader
            .filter((c) => !c.isCode)
            .map((c) => componentEntrypoint(c))
        ),
        // Each global variant context file
        ...codegenOutputs.flatMap((o) =>
          o.globalVariants.map((g) => g.contextFileName)
        ),
        // The global contexts provider
        ...codegenOutputs.flatMap((o) =>
          o.projectConfig.globalContextBundle
            ? makeGlobalContextsProviderFileName(o.projectConfig.projectId)
            : []
        ),
        ...codegenOutputs.flatMap((o) =>
          withoutNils(
            o.components.map(
              (c) => c.rscMetadata?.serverQueriesExecFunc?.fileName
            )
          )
        ),
      ],
      bundle: true,
      format: "esm",
      platform: target,
      external: deriveExternals(opts),
      define: deriveEsbuildDefines({ mode: opts.mode, target }),
      splitting: true,
      metafile: true,
      outbase: dir,
      outdir: outDirEsm,
      absWorkingDir: dir,
      treeShaking: true,
      target: target === "node" ? "node12" : "es6",
      // By default, for node, the "entry" file used by esbuild is
      // "main", which is usually commonjs. However, since esbuild does
      // not tree-shake commonjs, we end up with huge bundles when building
      // for node. Instead, here, we force esbuild to consider "module" instead,
      // which is usually esm (but hopefully, still node-compatible).
      // See https://esbuild.github.io/api/#main-fields
      // This is risky! We may encounter modules where this creates issues.
      // We override those issues, somehow, in plugins below :-/
      mainFields: target === "node" ? ["module", "main"] : undefined,
      minify: true,
      // We keep the hash out of the output entrypoint names, as we need
      // to know what files to load in the loader, and we only know them
      // by the file names without the content hash.
      entryNames: "[name]",
      preserveSymlinks: true,
      plugins: withoutNils([
        fixAntdPathPlugin,
        // Handle newer antd4 whose transpiled code triggers this limitation (so we don't have to somehow pin antd4 version in our monorepo)
        // https://github.com/evanw/esbuild/issues/1941
        {
          name: "antd-fixup",
          setup(build) {
            build.onLoad({ filter: /FormItem\.js$/ }, async (args) => {
              const text = await fs.readFile(args.path, "utf8");
              return {
                contents: text.replace(
                  /FormContext, FormItemStatusContext, NoStyleItemContext/,
                  "FormContext, NoStyleItemContext"
                ),
              };
            });
          },
        },
        {
          name: "fix-plasmic-host-sub-imports",
          setup(build) {
            // hostless packages import directly from
            // @plasmicapp/host/registerComponent to register component.
            // However, @plasmicapp/host is not included (it's an external)
            // and even though the loader client will swap in @plasmicapp/host,
            // it will not swap in @plasmicapp/host/registerComponent. Thankfully,
            // the registration calls of hostless components are not actually needed
            // in production, only on the canvas, so we just replace it with a no-op
            // function.
            build.onResolve(
              {
                filter:
                  /^@plasmicapp\/host\/(registerComponent|registerGlobalContext|registerTrait|registerToken)$/,
              },
              async (args) => {
                const newPath = path.join(
                  dir,
                  "node_modules",
                  "plasmic-internal-noop-func",
                  "dist",
                  args.kind === "require-call" ? "index.js" : "index.esm.js"
                );
                return {
                  path: newPath,
                  external: false,
                };
              }
            );
          },
        },

        // For node, we overwrite the default mainField to prefer `module`
        // instead of `main` (see above). However, this may cause issues for
        // some packages!  We switch these back to using a hard-coded entrypoint
        // instead :-/  We only need to do this for target=node, because when
        // target=browser, prefering `module` is the common default.
        target === "node"
          ? {
              name: "fix-main-field-entry",
              setup(build) {
                build.onResolve(
                  {
                    filter: /^resize-observer-polyfill$|^@emotion\/hash$/,
                  },
                  async (args) => {
                    if (
                      args.kind === "require-call" &&
                      args.path === "resize-observer-polyfill"
                    ) {
                      // Even with entrypoints defaulting to "module", some modules
                      // do not have esm entrypoint. Specifically, react-slick
                      // does not! So react-slick is always cjs, and react-slick
                      // imports resize-observer-polyfill, which does come in
                      // esm and cjs, and when esbuild chooses esm, it causes
                      // issues. So we explicitly use the cjs version of
                      // resize-observer-polyfill when coming from require-call.
                      return {
                        path: path.join(
                          dir,
                          "node_modules",
                          "resize-observer-polyfill",
                          "dist",
                          "ResizeObserver.js"
                        ),
                        external: false,
                      };
                    } else if (args.path === "@emotion/hash") {
                      // Also use cjs for @emotion/hash; imported by
                      // @ant-design/cssinjs and react-awesome-reveal; not sure
                      // why the esm build doesn't work for them, they are
                      // importing from esm builds as well...
                      const pkgDir = await findPkgDir(
                        args.resolveDir,
                        "@emotion/hash"
                      );
                      if (pkgDir) {
                        const pkgJson = await getPkgJson(pkgDir);
                        const cjs = path.resolve(
                          path.join(pkgDir, pkgJson.main)
                        );
                        return {
                          path: cjs,
                          external: false,
                        };
                      }
                      return undefined;
                    }
                    return undefined;
                  }
                );
              },
            }
          : undefined,
        {
          // Some of the pro-components like Table pulls in pro-form, which
          // pulls in a lot of other antd components that we don't need yet.
          // So we replace pro-form with stubs for now.
          name: "remove-antd-pro-form",
          setup(build) {
            build.onResolve(
              {
                filter: /^@ant-design\/pro-form$/,
              },
              (args) => {
                const newPath = path.join(
                  dir,
                  "node_modules",
                  "ant-design-pro-form-stub",
                  "dist",
                  args.kind === "require-call" ? "index.js" : "index.esm.js"
                );
                return {
                  path: newPath,
                  external: false,
                };
              }
            );
          },
        },
      ]),
    });

    // Next, we just convert all the esm modules into cjs
    const outDir = path.join(dir, `dist-esbuild-${target}`);
    await esbuild.build({
      entryPoints: glob.sync(path.join(outDirEsm, "*.js")),
      outdir: outDir,
      format: "cjs",
      platform: target,
      metafile: true,
      absWorkingDir: outDirEsm,
      minify: true,
      entryNames: "[name]",
      define: deriveEsbuildDefines({ mode: opts.mode, target }),
      target: target === "node" ? "node12" : "es6",
    });

    metafiles[target] = outRes.metafile;
  }

  // Next we build the css, which is really just a minification pass, as we don't
  // do any combining / chunking / etc. There's no difference for minification of
  // css whether for node or browser, so we only do it once here (and output to
  // dist-esbuild-browser):
  const browserOutDir = path.join(dir, `dist-esbuild-browser`);
  // First, all the component css
  await esbuild.build({
    entryPoints: glob.sync(path.join(dir, "css__*.css")),
    minify: true,
    outdir: browserOutDir,
    // Target browsers so that esbuild doesn't minify code that would create incompatible css
    // with older browsers. https://esbuild.github.io/content-types/#css
    // Targetting safari 13: https://developer.apple.com/documentation/safari-release-notes/safari-13-release-notes https://en.wikipedia.org/wiki/Safari_version_history
    // as per release note, safari 14 is introducing newly css properties so we target 1 below, some stuff is not listed in release note
    // as https://developer.mozilla.org/en-US/docs/Web/CSS/inset
    // Not targetting a chrome version, as anything that works in older safari should work in recent chrome
    target: ["safari13"],
  });
  // Next, the "common" / shared css like default react-web styles, project defaults,
  // etc. These are imported by css-entrypoint.tsx, so doing this will combine the
  // referenced css
  await esbuild.build({
    entryPoints: [path.join(dir, "css-entrypoint.tsx")],
    minify: true,
    outdir: browserOutDir,
    bundle: true,
    plugins: [
      {
        name: "fix-slick-carousel",
        setup(build) {
          // We rewrite import for slick-carousel/slick/slick-theme.css into
          // slick-carousel-theme instead, which a fork without any references
          // to svg, tff, etc files that we don't have loaders for and don't
          // care about in any case.
          build.onResolve(
            { filter: /^slick-carousel\/slick\/slick-theme\.css$/ },
            (args) => {
              return {
                path: path.join(
                  args.resolveDir,
                  "node_modules",
                  "slick-carousel-theme",
                  "slick",
                  "slick-theme.css"
                ),
              };
            }
          );
        },
      },
    ],
  });
  // We rename the output css file from the last step to entrypoint.css, which is what
  // loader expects
  await fs.rename(
    path.join(browserOutDir, "css-entrypoint.css"),
    path.join(browserOutDir, "entrypoint.css")
  );

  // Create the css modules by reading them back out from disk
  const cssModules: AssetModule[] = [];
  for (const file of await fs.readdir(browserOutDir)) {
    if (file.endsWith(".css")) {
      const content = (
        await fs.readFile(path.join(browserOutDir, file))
      ).toString();
      cssModules.push({
        type: "asset",
        fileName: path.basename(file),
        source: content,
      });
    }
  }

  // Create the js modules by reading them back out from disk
  const buildJsModules = async (target: "browser" | "node") => {
    if (opts.browserOnly && target === "node") {
      return [];
    }

    const meta = ensure(metafiles[target], `No metafile for ${target}`);

    const buildJsModule = async (
      file: string,
      fileMeta: Metafile["outputs"][string]
    ) => {
      const origContent = (
        await fs.readFile(
          path.join(
            dir,
            file.replace(`dist-esbuild-esm-${target}`, `dist-esbuild-${target}`)
          )
        )
      ).toString();
      // the esbuild cjs output expects `module` to be in the namespace, and it writes
      // to module.exports.  Unfortunately our loader, previously targeting rollup,
      // provides `exports` in the namespace and not `module`.  To make esbuild a
      // drop-in replacement for rollup, we create the `module` object, and then at the
      // end, assign `module.exports` to the `exports` object provided by the loader.
      const content = `
var module={};
${origContent}
Object.assign(exports,module.exports);
      `.trim();
      const mod: CodeModule = {
        type: "code",
        fileName: path.basename(file),
        code: content,
        imports: [
          ...fileMeta.imports.map((x) => path.basename(x.path)),
          // css that was used in this chunk will be marked in fileMeta.inputs,
          // so we can record that dependency here.
          ...Object.keys(fileMeta.inputs)
            .filter((x) => x.endsWith(".css"))
            .map((x) => path.basename(x)),
        ],
      };
      return mod;
    };

    const modules: (CodeModule | AssetModule)[] = [];
    const jsModules = await Promise.all(
      Object.entries(meta.outputs)
        .filter(([file]) => file.endsWith(".js"))
        .map(async ([file, fileMeta]) => {
          return await buildJsModule(file, fileMeta);
        })
    );
    modules.push(...jsModules);
    modules.push(...cssModules);
    return modules;
  };

  const [serverModules, browserModules] = await Promise.all([
    buildJsModules("node"),
    buildJsModules("browser"),
  ]);

  const modules = {
    server: serverModules,
    browser: browserModules,
  };

  const output = makeLoaderBundleOutput(
    modules,
    codegenOutputs,
    componentDeps,
    opts
  );

  return output;
}

export async function bundleModules(
  dir: string,
  codegenOutputs: CodegenOutputBundle[],
  componentDeps: Record<string, string[]>,
  componentRefs: ComponentReference[],
  opts: BundleOpts
): Promise<LoaderBundleOutput> {
  // esbuild only supports loaderVersion >= 7; the compponent
  // and global variant substitution API is necessary to ensure
  // component substitutions and specifying global variants work.
  if (opts.loaderVersion < 7) {
    throw new LoaderDeprecatedVersionError();
  }

  return withSpan("loader-bundle-esbuild", async () => {
    try {
      return await bundleModulesEsbuild(
        dir,
        codegenOutputs,
        componentDeps,
        opts
      );
    } catch (err) {
      const bundleErrorStr: string = err.toString();
      console.error(
        `Error bundling with esbuild: ${bundleErrorStr}: ${err.stack}`
      );
      try {
        const errPrefix = await uploadErrorFiles(err, dir);
        console.log(`Errors uploaded: ${errPrefix}`);
      } catch (err2) {
        console.error(`Error uploading error files: ${err2.toString()}`);
      }

      const transformedBundleErrorStr = transformBundlerErrors(
        bundleErrorStr,
        componentRefs
      );

      if (transformedBundleErrorStr) {
        console.log(`transformedError: ${transformedBundleErrorStr}`);
        throw new LoaderBundlingError(transformedBundleErrorStr);
      }

      await checkEsbuildFatalError(bundleErrorStr);

      throw new Error(`Error bundling with esbuild: ${bundleErrorStr}`);
    }
  });
}

function deriveEsbuildDefines(opts: {
  mode: "production" | "development";
  target: "browser" | "node";
}) {
  return {
    "process.env.NODE_ENV": JSON.stringify(opts.mode),
    // import.meta.env as in https://vitejs.dev/guide/env-and-mode.html
    "import.meta.env": JSON.stringify({
      MODE: opts.mode,
      PROD: opts.mode === "production",
      DEV: opts.mode === "development",
      SSR: opts.target === "node",
    }),
    "import.meta.env.MODE": JSON.stringify(opts.mode),
  };
}

function deriveExternals(opts: BundleOpts) {
  const external = [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",

    // We also inject @plasmicapp/query at run time, because loader-* will have
    // a copy of @plasmicapp/query already for doing pre-rendering, and the loader
    // downloaded files need to use the same copy, so that they will read from the
    // same context.
    "@plasmicapp/query",
  ];
  if (opts.loaderVersion >= 5) {
    // If loader is recent enough to handle that, also use @plasmicapp/host from
    // the client so there is only one data context.
    external.push("@plasmicapp/host");
  }
  if (opts.loaderVersion >= 6) {
    external.push("@plasmicapp/loader-runtime-registry");
  }
  if (opts.loaderVersion >= 9) {
    external.push("@plasmicapp/data-sources-context");
  }
  if (opts.platform === "nextjs") {
    external.push("next", "next/head", "next/link", "next/router");
  } else if (opts.platform === "gatsby") {
    external.push("gatsby");
  }
  return external;
}

function makeLoaderBundleOutput(
  modules: {
    browser: (CodeModule | AssetModule)[];
    server: (CodeModule | AssetModule)[];
  },
  codegenOutputs: CodegenOutputBundle[],
  componentDeps: Record<string, string[]>,
  opts: BundleOpts
) {
  function makeComponentMeta(
    codegenOutput: CodegenOutputBundle,
    compOutput: ComponentExportOutput
  ) {
    const skeletonFile = compOutput.skeletonModuleFileName.replace(
      ".tsx",
      ".js"
    );
    const renderFile = compOutput.renderModuleFileName.replace(".tsx", ".js");
    const entry = componentEntrypoint(compOutput).replace(".tsx", ".js");
    return {
      id: compOutput.id,
      displayName: compOutput.displayName,
      usedComponents: [...componentDeps[compOutput.id]].sort(),
      projectId: codegenOutput.projectConfig.projectId,
      name: compOutput.plasmicName,
      renderFile,
      skeletonFile,
      cssFile: compOutput.cssFileName,
      path: compOutput.path,
      isPage: compOutput.isPage,
      plumeType: compOutput.plumeType,
      entry,
      isCode: !!compOutput.isCode,
      isGlobalContextProvider: compOutput.isGlobalContextProvider,
      pageMetadata: compOutput.pageMetadata,
      metadata: compOutput.metadata,
      serverQueriesExecFuncFileName:
        compOutput.rscMetadata?.serverQueriesExecFunc?.fileName.replace(
          ".tsx",
          ".js"
        ),
    };
  }

  // Put together the LoaderBundleOutput.  Note we are sorting the various
  // arrays to ensure a consistent output, so that the automatic e-tag
  // generation will generate consistent e-tags
  const output: LoaderBundleOutput = {
    modules: opts.loaderVersion > 2 ? modules : modules.browser,
    external: [...deriveExternals(opts)].sort(),
    components: sortBy(
      codegenOutputs.flatMap((o) =>
        o.components.map((comp): ComponentMeta => makeComponentMeta(o, comp))
      ),
      (x) => x.id
    ),
    globalGroups: sortBy(
      codegenOutputs.flatMap((o) =>
        o.globalVariants.map((group) => ({
          id: group.id,
          projectId: o.projectConfig.projectId,
          name: group.name,
          contextFile: group.contextFileName.replace(".tsx", ".js"),
          type: group.type,
          useName: `use${group.name}`,
        }))
      ),
      (x) => x.id
    ),
    activeSplits: flatMap(
      withoutNils(codegenOutputs.map((out) => out.activeSplits))
    ),
    projects: sortBy(
      codegenOutputs.map((o) => ({
        id: o.projectConfig.projectId,
        teamId: o.projectConfig.teamId,
        name: o.projectConfig.projectName,
        version: o.projectConfig.version,
        indirect: o.projectConfig.indirect,
        remoteFonts: makeFontMetas(o.projectConfig.fontUsages),
        globalContextsProviderFileName: o.projectConfig.globalContextBundle
          ? makeGlobalContextsProviderFileName(
              o.projectConfig.projectId
            ).replace(".tsx", ".js")
          : "",
      })),
      (x) => x.id
    ),
    // Populated in `upsertS3CacheEntry` call
    bundleKey: null,
    deferChunksByDefault: false,
    disableRootLoadingBoundaryByDefault: true,
  };
  return output;
}

function makeFontMetas(usages: FontUsage[]) {
  const googleUsages = usages.filter(
    (usage) => usage.fontType === "google-font"
  );
  if (googleUsages.length > 0) {
    return [
      {
        url: makeGoogleFontUrl(googleUsages),
      },
    ];
  }
  return [];
}

async function findPkgDir(startDir: string, pkg: string) {
  while (startDir.startsWith("/tmp/tmp")) {
    const pkgPath = path.join(startDir, "node_modules", pkg);
    try {
      await fs.access(pkgPath);
      return pkgPath;
    } catch {
      startDir = path.dirname(startDir);
    }
  }
  return undefined;
}

async function getPkgJson(dir: string) {
  try {
    const res = await fs.readFile(path.join(dir, "package.json"));
    return JSON.parse(res.toString());
  } catch {
    return undefined;
  }
}

/**
 * An esbuild plugin that turns:
 *
 *   import { Button } from "antd";
 *
 * into...
 *
 *   import Button from "antd/es/button";
 *
 * This is because esbuild does not tree-shake antd well; when there are multiple
 * entrypoints using different sets of antd components, antd becomes a single
 * chunk that contains all the components used by _any_ entrypoint.  So if one
 * page uses antd Form, then all pages will have to load Form.  See https://app.shortcut.com/plasmic/story/33038/plasmicpkgs-antd-bundling-struggles#activity-38094 for details.
 *
 * While we can't generally switch to importing from "antd/es/button" in our
 * plasmicpkgs, we _can_ do so here when building the loader bundle, as esbuild
 * is fine with this!
 *
 * This plugin is modeled after a similar esbuild plugin for lodash:
 * https://github.com/josteph/esbuild-plugin-lodash/blob/main/index.js
 */
const fixAntdPathPlugin: EsbuildPlugin = {
  name: "fix-antd-paths",
  setup(build) {
    build.onLoad(
      {
        // Only apply this for imports of antd from @plasmicpkgs/antd5 and
        // @plasmicpkgs/plasmic-rich-components
        filter: /.*\/@plasmicpkgs\/(antd5|plasmic-rich-components)\/.*\.js/,
      },
      async (args) => {
        let contents = await fs.readFile(args.path, "utf8");

        // Look for lines that import from antd
        const antdImportRe =
          /import\s+?(?:(?:(?:[\w*\s{},]*)\s+from\s+?)|)['"](?:(?:antd\/?.*?))['"][\s]*?(?:;|$|)/g;

        const antdImports = contents.match(antdImportRe);
        if (!antdImports) {
          // No antd imports, so nothing to do!
          return { contents, loader: "js" };
        }

        const toFixedPath = (name: string) => {
          // Most of the time, turning a component into kebab-case is the
          // right thing to do.
          return `antd/es/${kebabCase(name)}`;
        };

        // This matches what's inside the {} in
        // `import { Button, Input } from "antd";`
        const destructuredRe = /\{\s*(((\w+),?\s*)+)\}/g;
        for (const line of antdImports) {
          const destructured = line.match(destructuredRe);
          if (!destructured) {
            continue;
          }

          const importNames = destructured[0]
            .replace(/[{}]/g, "")
            .trim()
            .split(",")
            .map((x) => x.trim())
            .filter((x) => x && x.length > 0);

          const fixedImports = importNames.map((name) => {
            if (name.includes(" as ")) {
              // when you do `import { Button as MyButton } from "antd"`
              const [realName, aliasName] = name.split(" as ");
              return `import ${aliasName} from "${toFixedPath(realName)}";`;
            } else {
              return `import ${name} from "${toFixedPath(name)}";`;
            }
          });
          contents = contents.replace(line, fixedImports.join("\n"));
        }
        return { contents, loader: "js" };
      }
    );
  },
};
