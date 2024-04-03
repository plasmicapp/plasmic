import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import {
  Compiler,
  CopyRspackPlugin,
  DefinePlugin,
  ProvidePlugin,
  RspackPluginInstance,
} from "@rspack/core";
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
        // TODO: Add source map transforms (https://gerrit.aws.plasmic.app/c/create-react-app-new/+/12102).
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
              templateParameters: {
                assetPrefix: publicUrl,
              },
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
        new StudioHtmlPlugin(publicUrl, commitHash),
      ],
    },
  },
});
