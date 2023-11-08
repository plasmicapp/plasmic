import {
  ComponentRenderData,
  extractPlasmicQueryDataFromElement,
  GlobalVariantSpec,
  initPlasmicLoader,
  renderToString,
} from "@plasmicapp/loader-react";
import React from "react";
import ReactDOMServer from "react-dom/server";
const {
  SCMP_ACT_ALLOW,
  SCMP_ACT_KILL_PROCESS,
  NodeSeccomp,
} = require("../sec.js");

export async function renderBundle(opts: {
  projectId: string;
  component: string;
  version: string | undefined;
  projectToken: string;
  bundle: ComponentRenderData;
  prepass?: boolean;
  componentProps?: Record<string, any>;
  globalVariants?: GlobalVariantSpec[];
  hydrate?: boolean;
  embedHydrate?: boolean;
}) {
  const {
    projectId,
    component,
    version,
    projectToken,
    bundle: origBundle,
    prepass,
    componentProps,
    globalVariants,
    embedHydrate,
    hydrate,
  } = opts;

  const loader = initPlasmicLoader({
    projects: [
      {
        id: projectId,
        token: projectToken,
      },
    ],
    preview: !version,
  });

  const bundle =
    origBundle ??
    (await loader.fetchComponentData({
      name: component,
      projectId,
    }));

  const prefetchedQueryData = prepass
    ? await extractPlasmicQueryDataFromElement(
        loader,
        { name: component, projectId },
        {
          prefetchedData: bundle,
          componentProps,
          globalVariants,
        }
      )
    : undefined;

  const innerHtml = renderToString(
    loader,
    { name: component, projectId },
    {
      prefetchedData: bundle,
      componentProps,
      globalVariants,
      prefetchedQueryData,
    }
  );

  const outerElement = React.createElement(
    React.Fragment,
    {},
    React.createElement("div", {
      "data-plasmic-project-id": projectId,
      "data-plasmic-project-version": version,
      "data-plasmic-component": component,
      "data-plasmic-project-token":
        hydrate && !embedHydrate ? projectToken : "",
      "data-plasmic-component-data":
        hydrate && embedHydrate ? JSON.stringify(bundle) : "",
      "data-plasmic-component-props": JSON.stringify(componentProps || {}),
      "data-plasmic-global-variants": JSON.stringify(globalVariants || []),
      "data-plasmic-prefetched-query-data":
        hydrate && embedHydrate && prepass
          ? JSON.stringify(prefetchedQueryData || {})
          : "",
      dangerouslySetInnerHTML: { __html: innerHtml },
    }),
    hydrate &&
      React.createElement("script", {
        async: true,
        src: `${process.env.CODEGEN_HOST}/static/js/loader-hydrate.js`,
      })
  );

  const outerHtml = ReactDOMServer.renderToStaticMarkup(outerElement);
  return {
    html: outerHtml,
  };
}

async function main(argv = process.argv) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.info = () => {};
  console.debug = () => {};

  if (!process.env.DISABLE_SECCOMP) {
    NodeSeccomp().load();
  }

  const args = JSON.parse(argv[2]);
  const { html } = await renderBundle(args);
  process.stdout.write(html);
}

if (require.main === module) {
  const res = main();
}
