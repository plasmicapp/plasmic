import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { CopyRspackPlugin, DefinePlugin, ProvidePlugin } from "@rspack/core";
import { execSync } from "child_process";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MonacoWebpackPlugin from "monaco-editor-webpack-plugin";
import { homepage } from "./package.json";
import { StudioHtmlPlugin } from "./tools/studio-html-plugin";

const commitHash = execSync("git rev-parse HEAD").toString().slice(0, 6);
const buildEnv = process.env.NODE_ENV ?? "production";
const publicUrl =
  buildEnv === "development" ? process.env.PUBLIC_URL : homepage;
const port = process.env.PORT ? +process.env.PORT : 3003;
const backendPort = process.env.BACKEND_PORT || 3004;

console.log(`Starting rsbuild...
- commitHash: ${commitHash}
- buildEnv: ${buildEnv}
- publicUrl: ${publicUrl}
- port: ${port}
- backendPort: ${backendPort}
`);

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
