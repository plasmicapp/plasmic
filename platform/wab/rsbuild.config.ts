import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import {
  Compiler,
  CopyRspackPlugin,
  DefinePlugin,
  ProvidePlugin,
  RspackPluginInstance,
} from "@rspack/core";
import { Source } from "@rspack/core/dist/Template";
import { execSync } from "child_process";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MonacoWebpackPlugin from "monaco-editor-webpack-plugin";
import { homepage } from "./package.json";
import { StudioHtmlPlugin } from "./tools/studio-html-plugin";

const commitHash = execSync("git rev-parse HEAD").toString().slice(0, 6);
const buildEnv = process.env.NODE_ENV ?? "production";
const isProd = buildEnv === "production";
const port: number = process.env.PORT ? +process.env.PORT : 3003;
const backendPort: number = process.env.BACKEND_PORT
  ? +process.env.BACKEND_PORT
  : 3004;
const publicUrl: string =
  process.env.PUBLIC_URL ?? (isProd ? homepage : `http://localhost:${port}`);

console.log(`Starting rsbuild...
- commitHash: ${commitHash}
- buildEnv: ${buildEnv}
- publicUrl: ${publicUrl}
- port: ${port}
- backendPort: ${backendPort}
`);

/**
 * Appends a sourceMappingURL for js files in paths, by looking for
 * the source map file with the same hash-tagged name
 */
class AppendSourceMapWithHash implements RspackPluginInstance {
  constructor(
    private opts: {
      paths: string[];
    }
  ) {}

  apply(compiler: Compiler) {
    const processFile = (filePath: string, assets: Record<string, Source>) => {
      if (this.shouldProcessFile(filePath)) {
        const sourceMapFilePath = this.makeSourceMapFilePath(filePath);
        if (assets[sourceMapFilePath]) {
          let content = assets[filePath].source();
          // We use the full path (with publicUrl) because the files may be
          // loaded from the inner frame and so the relative path would be
          // wrong.
          const newMapping = `//# sourceMappingURL=${publicUrl}/${sourceMapFilePath}`;
          if (content.includes("//# sourceMappingURL=")) {
            content = content
              .toString()
              .replace(/\/\/# sourceMappingURL=[^\s*]*\s*$/, newMapping);
          } else {
            content = content.toString() + `\n${newMapping}\n`;
          }
          assets[filePath] = {
            source: () => content,
            size: () => content.length,
          };
        }
      }
    };

    // This hook transforms the source map reference in dev mode
    compiler.hooks.compilation.tap("AppedSourceMapWithHash", (compilation) => {
      compilation.hooks.processAssets.tapAsync(
        {
          name: "AppendSourceMapWithHash",
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets, callback) => {
          Object.keys(assets).forEach((filePath) => {
            processFile(filePath, assets);
          });
          callback();
        }
      );
    });

    // This hook appends the source map reference when doing `yarn build`. Not
    // sure why this is necessary and why the previous hook alone isn't enough;
    // with just the previous hook, the source map reference is stripped out
    // completely for `yarn build`.
    compiler.hooks.emit.tapAsync(
      "AppendSourceMapWithHash",
      (compilation, callback) => {
        Object.keys(compilation.assets).forEach((filePath) => {
          processFile(filePath, compilation.assets);
        });
        callback();
      }
    );
  }

  private makeSourceMapFilePath(file: string) {
    const parts = file.split(".");
    const ext = parts[parts.length - 1];
    const hash = parts[parts.length - 2];
    const rest = parts.slice(0, parts.length - 2).join(".");
    return `${rest}.${ext}.${hash}.map`;
  }

  private shouldProcessFile(filePath: string) {
    return (
      filePath.endsWith(".js") &&
      this.opts.paths.some((path) => filePath.startsWith(path))
    );
  }
}

/**
 * rspack when concatenating css files doesn't properly move @import
 * statements to the top of the file. This is a workaround for that.
 *
 * See https://github.com/web-infra-dev/rsbuild/issues/1912
 */
class FixCssImports implements RspackPluginInstance {
  apply(compiler: Compiler) {
    const fixCssImports = (css: string) => {
      const re = /@import\s*(url\()?"[^"]*"\)?;/g;
      const matches = Array.from(css.matchAll(re)).map((m) => m[0]);
      if (matches.length > 0) {
        css = css.replaceAll(re, "");
        css = `${matches.join("")}${css}`;
      }
      return css;
    };

    compiler.hooks.compilation.tap("FixCssImports", (compilation) => {
      compilation.hooks.processAssets.tapAsync(
        {
          name: "FixCssImports",
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
        },
        (assets, callback) => {
          Object.keys(assets).forEach((filePath) => {
            if (filePath.endsWith(".css")) {
              const css = assets[filePath].source().toString();
              const fixedCss = fixCssImports(css);
              assets[filePath] = {
                source: () => fixedCss,
                size: () => fixedCss.length,
              };
            }
          });
          callback();
        }
      );
    });
  }
}

export default defineConfig({
  dev: {
    // We write intermediate files to disk (build/) for debugging,
    // and also because our local host server will serve from there.
    writeToDisk: publicUrl.includes("localhost") ? true : false,
  },
  server: {
    port,
    proxy: {
      "/api": `http://localhost:${backendPort}`,
    },
  },
  output: {
    distPath: {
      root: "build",
    },
    charset: "utf8",
    sourceMap: {
      js: isProd ? "source-map" : "cheap-module-source-map",
      css: true,
    },
  },
  plugins: [pluginReact()],
  tools: {
    // We use html-webpack-plugin directly instead of relying in @rsbuild/core
    // html plugin so it works with StudioHtmlPlugin.
    htmlPlugin: false,
    rspack: {
      plugins: [
        // For most files, we are appending a commitHash to the file name
        // for caching and cache-busting. Ideally they'd be using a
        // content hash instead, but the client needs to know the exact
        // file name to use, and it's too much work to expose each
        // one by one. Maybe one day! For now, at least this means all
        // the files are cacheable until the next deployment.
        new CopyRspackPlugin({
          patterns: [
            {
              from: "dev-build/static/styles/",
              to: `static/styles/[path][name].${commitHash}[ext]`,
            },
            {
              from: "../sub/public/static/",
              to: `static/[path][name].${commitHash}[ext]`,
            },
            {
              from: "../live-frame/build/",
              to: `static/live-frame/build/[path][name].${commitHash}[ext]`,
            },
            {
              from: "../react-web-bundle/build/",
              to: `static/react-web-bundle/build/[path][name].${commitHash}[ext]`,
            },
            {
              from: "../canvas-packages/build/",
              to: `static/canvas-packages/build/[path][name].${commitHash}[ext]`,
            },
            {
              from: "../loader-html-hydrate/build/",
              to: "static/js/",
            },
          ],
        }),
        new AppendSourceMapWithHash({
          paths: [
            "static/sub/build/",
            "static/live-frame/build/",
            "static/react-web-bundle/build/",
            "static/canvas-packages/build/",
          ],
        }),
        new FixCssImports(),
        new HtmlWebpackPlugin({
          template: "../sub/public/static/host.html",
          filename: `static/host.html`,
          inject: false,
          templateParameters: {
            commitHash,
          },
        }),
        new HtmlWebpackPlugin({
          template: "../sub/public/static/popup.html",
          filename: `static/popup.html`,
          inject: false,
        }),
        new ProvidePlugin({
          process: [require.resolve("process/browser")],
          Buffer: ["buffer", "Buffer"],
        }),
        new DefinePlugin({
          PUBLICPATH: JSON.stringify(publicUrl),
          COMMITHASH: JSON.stringify(commitHash),
          DEPLOYENV: JSON.stringify(buildEnv),
          "process.env": JSON.stringify(process.env),
        }),
        new MonacoWebpackPlugin(),
        new HtmlWebpackPlugin(
          Object.assign(
            {},
            {
              inject: true,
              template: "./public/index.html",
            },
            buildEnv === "production"
              ? {
                  minify: {
                    removeComments: true,
                    collapseWhitespace: true,
                    removeRedundantAttributes: true,
                    useShortDoctype: true,
                    removeEmptyAttributes: true,
                    removeStyleLinkTypeAttributes: true,
                    keepClosingSlash: true,
                    minifyJS: true,
                    minifyCSS: true,
                    minifyURLs: true,
                  },
                }
              : undefined
          )
        ),
        new StudioHtmlPlugin(commitHash),
      ],
    },
  },
});
