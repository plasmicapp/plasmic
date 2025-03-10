const esbuild = require("esbuild");
const alias = require("esbuild-plugin-alias");
const { externalGlobalPlugin } = require("esbuild-plugin-external-global");
const fs = require("fs");
const path = require("path");
const sha256 = require("sha256");
const hostlessPkgNames = require("./hostlessList.json");

const inlineCssPlugin = () => {
  return {
    name: "esbuild-plugin-inline-css",
    setup(build) {
      build.onLoad({ filter: /\.(css)$/ }, async (args) => {
        const sourcePath = path.resolve(args.resolveDir, args.path);
        const sourceJS = await generateInjectCSS(sourcePath);
        return {
          contents: sourceJS,
          loader: "js",
        };
      });
    },
  };
};

async function generateInjectCSS(sourcePath) {
  const styleID = sha256(sourcePath);
  const sourceCSS = fs.readFileSync(sourcePath);

  return `(function(){
        if (!document.getElementById('${styleID}')) {
            var e = document.createElement('style');
            e.id = '${styleID}';
            e.textContent = ${JSON.stringify(sourceCSS.toString())};
            document.head.appendChild(e);
        }
    })();`;
}

const isProd = process.env.NODE_ENV === "production";
const maybeBuildIndex = parseInt(process.env.BUILD_INDEX);
const watchMode = !!process.env.ESBUILD_WATCH;

const antdModules = {
  antd: "__Sub._antd_",
  "antd/es/anchor/style": "__Sub._antd_es_anchor_style_",
  "antd/es/avatar/style": "__Sub._antd_es_avatar_style_",
  "antd/es/badge/style": "__Sub._antd_es_badge_style_",
  "antd/es/button": "__Sub._antd_es_button_",
  "antd/es/breadcrumb/style": "__Sub._antd_es_breadcrumb_style_",
  "antd/es/card/style": "__Sub._antd_es_card_style_",
  "antd/es/cascader/style": "__Sub._antd_es_cascader_style_",
  "antd/es/checkbox/style": "__Sub._antd_es_checkbox_style_",
  "antd/es/date-picker/style": "__Sub._antd_es_date_picker_style_",
  "antd/es/descriptions/style": "__Sub._antd_es_descriptions_style_",
  "antd/es/divider/style": "__Sub._antd_es_divider_style_",
  "antd/es/drawer/style": "__Sub._antd_es_drawer_style_",
  "antd/es/dropdown": "__Sub._antd_es_dropdown_",
  "antd/es/dropdown/style": "__Sub._antd_es_dropdown_style_",
  "antd/es/form/ErrorList": "__Sub._antd_es_form_ErrorList_",
  "antd/es/form/Form": "__Sub._antd_es_form_Form_",
  "antd/es/form/context": "__Sub._antd_es_form_context_",
  "antd/es/form/hooks/useFormInstance":
    "__Sub._antd_es_form_hooks_useFormInstance_",
  "antd/es/form/style": "__Sub._antd_es_form_style_",
  "antd/es/image/style": "__Sub._antd_es_image_style_",
  "antd/es/input-number/style": "__Sub._antd_es_input_number_style_",
  "antd/es/input/style": "__Sub._antd_es_input_style_",
  "antd/es/layout/style": "__Sub._antd_es_layout_style_",
  "antd/es/list/style": "__Sub._antd_es_list_style_",
  "antd/es/locale/zh_CN": "__Sub._antd_es_locale_zh_CN_",
  "antd/es/menu/style": "__Sub._antd_es_menu_style_",
  "antd/es/message/style": "__Sub._antd_es_message_style_",
  "antd/es/modal/style": "__Sub._antd_es_modal_style_",
  "antd/es/popover/style": "__Sub._antd_es_popover_style_",
  "antd/es/progress/style": "__Sub._antd_es_progress_style_",
  "antd/es/radio": "__Sub._antd_es_radio_",
  "antd/es/radio/style": "__Sub._antd_es_radio_style_",
  "antd/es/rate/style": "__Sub._antd_es_rate_style_",
  "antd/es/row/style": "__Sub._antd_es_row_style_",
  "antd/es/segmented/style": "__Sub._antd_es_segmented_style_",
  "antd/es/select": "__Sub._antd_es_select_",
  "antd/es/select/style": "__Sub._antd_es_select_style_",
  "antd/es/skeleton/style": "__Sub._antd_es_skeleton_style_",
  "antd/es/slider/style": "__Sub._antd_es_slider_style_",
  "antd/es/space/style": "__Sub._antd_es_space_style_",
  "antd/es/spin/style": "__Sub._antd_es_spin_style_",
  "antd/es/statistic/style": "__Sub._antd_es_statistic_style_",
  "antd/es/steps/style": "__Sub._antd_es_steps_style_",
  "antd/es/switch/style": "__Sub._antd_es_switch_style_",
  "antd/es/table/hooks/useLazyKVMap":
    "__Sub._antd_es_table_hooks_useLazyKVMap_",
  "antd/es/table/hooks/usePagination":
    "__Sub._antd_es_table_hooks_usePagination_",
  "antd/es/table/hooks/useSelection":
    "__Sub._antd_es_table_hooks_useSelection_",
  "antd/es/table/style": "__Sub._antd_es_table_style_",
  "antd/es/tabs/style": "__Sub._antd_es_tabs_style_",
  "antd/es/theme/interface": "__Sub._antd_es_theme_interface_",
  "antd/es/theme/internal": "__Sub._antd_es_theme_internal_",
  "antd/es/theme/themes/default": "__Sub._antd_es_theme_themes_default_",
  "antd/es/tooltip/style": "__Sub._antd_es_tooltip_style_",
  "antd/es/tree-select/style": "__Sub._antd_es_tree_select_style_",
  "antd/es/typography/style": "__Sub._antd_es_typography_style_",
  "antd/es/upload/style": "__Sub._antd_es_upload_style_",
};

// We will be bundling the canvas-packages in two different ways:
// 1. Accessing react/jsx-runtime from node_modules/jsx-runtime
// 2. Accessing react/jsx-runtime from __Sub.jsxRuntime
//
// Since the access to __Sub depends on the version of @plasmicapp/host, we need to keep
// both approaches so that older versions of @plasmicapp/host can still work with the
// canvas-packages.
//
// The code components from rich-components are the only known ones to require the usage
// of react/jsx-runtime. But, even then we will still bundle all code components in two
// versions, so that we can have a single concept of versioning for all canvas-packages.
const clientEntries = [
  {
    pkg: "index",
  },
  ...hostlessPkgNames.flatMap((pkg) => [
    {
      pkg,
    },
    {
      pkg,
      useSubJSXRuntime: true,
    },
  ]),
];

const clientConfigs = clientEntries.map(({ pkg, useSubJSXRuntime }) => ({
  entryPoints: [`./src/${pkg}.ts`],
  outfile: `./build/${pkg === "index" ? "client" : pkg}${
    useSubJSXRuntime ? "-v2" : ""
  }.js`,
  plugins: [
    // Handle newer antd4 whose transpiled code triggers this limitation (so we don't have to somehow pin antd4 version in our monorepo)
    // https://github.com/evanw/esbuild/issues/1941
    {
      name: "antd-fixup",
      setup(build) {
        build.onLoad({ filter: /FormItem\.js$/ }, async (args) => {
          let text = await fs.promises.readFile(args.path, "utf8");
          return {
            contents: text.replace(
              /FormContext, FormItemStatusContext, NoStyleItemContext/,
              "FormContext, NoStyleItemContext"
            ),
          };
        });
      },
    },
    externalGlobalPlugin({
      react: "__Sub.React",
      "react-dom": "__Sub.ReactDOM",
      "@plasmicapp/host": "__Sub",
      "@plasmicapp/query": "__Sub.PlasmicQuery",
      ...(pkg.includes("plasmic-rich-components") ? antdModules : {}),
      ...(pkg.startsWith("commerce-")
        ? { "@plasmicpkgs/commerce": "__PlasmicCommerceCommon" }
        : {}),
      ...(useSubJSXRuntime
        ? {
            "react/jsx-runtime": "__Sub.jsxRuntime",
            "react/jsx-dev-runtime": "__Sub.jsxDevRuntime",
          }
        : {}),
    }),
    alias({
      "react-slick": path.join(
        process.cwd(),
        "node_modules/internal-react-slick/lib/index.js"
      ),
      "@ant-design/react-slick": path.join(
        process.cwd(),
        "node_modules/internal-react-slick/lib/index.js"
      ),
      "@plasmicapp/host/registerComponent": path.join(
        process.cwd(),
        "node_modules/@plasmicapp/host/registerComponent/dist/index.esm.js"
      ),
      "@plasmicapp/host/registerGlobalContext": path.join(
        process.cwd(),
        "node_modules/@plasmicapp/host/registerGlobalContext/dist/index.esm.js"
      ),
      "@plasmicapp/host/registerToken": path.join(
        process.cwd(),
        "node_modules/@plasmicapp/host/registerToken/dist/index.esm.js"
      ),
      "@plasmicapp/host/registerFunction": path.join(
        process.cwd(),
        "node_modules/@plasmicapp/host/registerFunction/dist/index.esm.js"
      ),
      ...(useSubJSXRuntime
        ? {}
        : {
            "react/jsx-runtime": path.join(
              process.cwd(),
              "node_modules/react/jsx-runtime.js"
            ),
            "react/jsx-dev-runtime": path.join(
              process.cwd(),
              "node_modules/react/jsx-dev-runtime.js"
            ),
          }),
    }),
    inlineCssPlugin(),
  ],
  external: [
    "react",
    "react-dom",
    "@plasmicapp/host",
    ...(pkg.includes("plasmic-rich-components")
      ? Object.keys(antdModules)
      : []),
    ...(pkg.startsWith("commerce-") ? ["@plasmicpkgs/commerce"] : []),
    ...(useSubJSXRuntime ? ["react/jsx-runtime", "react/jsx-dev-runtime"] : []),
  ],
  platform: "browser",
  target: "es2020",
  format: "iife",
  bundle: true,
  sourcemap: true,
  minify: isProd,
  watch: watchMode && {
    onRebuild(error) {
      if (error) {
        console.error("watch build failed:", error);
      } else {
        console.log("watch build succeeded");
      }
    },
  },
}));

(isNaN(maybeBuildIndex)
  ? clientConfigs
  : [clientConfigs[maybeBuildIndex]]
).forEach((config) =>
  esbuild
    .build(config)
    .then(() => {
      if (watchMode) {
        console.log("watching...");
      }
    })
    .catch((err) => {
      // console.error(err);
      process.exit(1);
    })
);

// We also use esbuild to build server-side packages, which are used for upgrading
// hostless packages via PublishHostless or for creating new hostless packages
// for cypress tests. All we need to do is to be able to run the
// registerAll() call to see and update component metadata -- we do not need to
// actually use or render the components! So we can just bundle them enough to
// do so, and don't have to worry about all the plugin package-swapping we have
// to do above for client packages.
const serverConfigs = hostlessPkgNames.map((pkg) => ({
  entryPoints: [`./src/${pkg}.ts`],
  outfile: `./build-server/${pkg}.js`,
  format: "cjs",
  platform: "node",
  target: "node14",
  bundle: true,
  minify: isProd,
}));

serverConfigs.forEach((config) => esbuild.build(config));
