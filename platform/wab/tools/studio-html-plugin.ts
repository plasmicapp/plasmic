import { Compiler, RspackPluginInstance } from "@rspack/core";
import fs from "fs";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { parse } from "node-html-parser";

const PLUGIN_NAME = "StudioHtmlPlugin";

/**
 * This plugin generates /static/js/studio.js, which the user can load into
 * their app to enable loading the studio.
 *
 * This plugin runs after HtmlWebpackPlugin emits index.html. We basically take
 * index.html and tweak it so that it can be loaded from the user's app.
 */
export class StudioHtmlPlugin implements RspackPluginInstance {
  commitHash: string;

  constructor(commitHash: string) {
    this.commitHash = commitHash;
  }
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation as any).afterEmit.tapAsync(
        PLUGIN_NAME,
        (data, cb) => {
          if (data.outputName !== "index.html") {
            // Move on.
            cb(null, data);
            return;
          }

          const html = compilation.assets[data.outputName].source();
          const root = parse(html);

          root.querySelector("head").insertAdjacentHTML(
            "afterbegin",
            `<script>
                try {
                  const params = new URL(
                    \`https://fakeurl/\${window.__PlasmicStudioArgs.replace(/#/, "?")}\`
                  ).searchParams;
                  if (params.get("isProd") === "true" || params.get("isProd") === "false") {
                    window.isProd = params.get("isProd") === "true";
                  }
                } catch(e) {}
              </script>`
          );

          root.querySelector("head").insertAdjacentHTML(
            "afterbegin",
            `<script id="ReactDevToolsScript" crossorigin="anonymous"></script>` // Replaced in studio.js
          );

          // Allow our instrumentation to run when the host URL uses HTTP
          root
            .querySelector("head")
            .insertAdjacentHTML(
              "afterbegin",
              `<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">`
            );

          // Add our own <base> to direct all requests to the main origin.
          root.querySelector("head").insertAdjacentHTML(
            "afterbegin",
            `<script>
                try {
                  const params = new URL(
                    \`https://fakeurl/\${window.__PlasmicStudioArgs.replace(/#/, "?")}\`
                  ).searchParams;
                  document.getElementById("newBase").href = params.get("origin")
                } catch(e) {}
              </script>`
          );
          root.querySelector("base").remove();
          root
            .querySelector("head")
            .insertAdjacentHTML("afterbegin", `<base id="newBase">`);

          // Include a marker that this is the Plasmic Studio iframe. This is
          // needed by sub client.js to determine when it should or shouldn't
          // need to create a studio iframe. Insert at beginning so client.js
          // actually sees it!
          root
            .querySelector("body")
            .insertAdjacentHTML(
              "afterbegin",
              '<div id="plasmic-studio-tag"></div>'
            );

          // Set crossorigin tag to global handlers to catch errors from Studio
          root.querySelectorAll("script").forEach((scriptElt) => {
            scriptElt.setAttribute("crossorigin", "anonymous");
          });

          // Generate studio.js. It will include this data at the top of the
          // script in JSON form.
          const injectedData = {
            html: root.toString(),
          };
          const template = fs.readFileSync(
            require.resolve("../public/studio.js.template"),
            "utf8"
          );
          const js = `
const __plasmicData = ${JSON.stringify(injectedData)};
${template}
`.trim();

          compilation.assets["static/js/studio.js"] = compilation.assets[
            `static/js/studio.${this.commitHash}.js`
          ] = {
            source: () => js,
            size: () => js.length,
            map: () => null,
            sourceAndMap: () => ({
              source: js,
              map: null,
            }),
          };

          // Tell webpack to move on.
          cb(null, data);
        }
      );
    });
  }
}
