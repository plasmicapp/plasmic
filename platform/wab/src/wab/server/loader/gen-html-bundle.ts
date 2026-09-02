import { pickTraceCarrier } from "@/wab/server/util/apm-util";
import { maybeStartGoogleCloudProfiler } from "@/wab/server/util/profiler";
import { getCodegenOriginUrl, getCodegenUrl } from "@/wab/shared/urls";
import { context, propagation } from "@opentelemetry/api";
import {
  GlobalVariantSpec,
  extractPlasmicQueryDataFromElement,
  initPlasmicLoader,
  renderToString,
} from "@plasmicapp/loader-react";
import React from "react";
import ReactDOMServer from "react-dom/server";

export async function genLoaderHtmlBundle(opts: {
  projectId: string;
  component: string;
  projectToken: string;
  version?: string;
  hydrate?: boolean;
  embedHydrate?: boolean;
  prepass?: boolean;
  componentProps?: any;
  globalVariants?: GlobalVariantSpec[];
}) {
  const {
    projectId,
    component,
    version,
    hydrate,
    embedHydrate,
    projectToken,
    componentProps,
    globalVariants,
    prepass,
  } = opts;

  const publicCodegenUrl = getCodegenUrl();
  const internalCodegenUrl = getCodegenOriginUrl();
  const loader = initPlasmicLoader({
    projects: [
      {
        id: projectId,
        version,
        token: projectToken,
      },
    ],
    preview: !version,
    apiHost: internalCodegenUrl,
    cdnHost: internalCodegenUrl,
  });

  const data = await loader.fetchComponentData({
    name: component,
    projectId,
  });

  const prefetchedQueryData = prepass
    ? await extractPlasmicQueryDataFromElement(
        loader,
        { name: component, projectId },
        {
          prefetchedData: data,
          componentProps,
          globalVariants,
        }
      )
    : undefined;

  const innerHtml = renderToString(
    loader,
    { name: component, projectId },
    {
      prefetchedData: data,
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
        hydrate && embedHydrate ? JSON.stringify(data) : "",
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
        src: `${publicCodegenUrl}/static/js/loader-hydrate.js`,
      })
  );

  const outerHtml = ReactDOMServer.renderToStaticMarkup(outerElement);

  return {
    html: outerHtml,
  };
}

async function main(argv = process.argv) {
  try {
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
    console.info = () => {};
    console.debug = () => {};
    // Start the profiler before generation so it captures the work.
    await maybeStartGoogleCloudProfiler("bwrap");
    const args = JSON.parse(argv[2]);
    const { html } = await context.with(
      propagation.extract(context.active(), pickTraceCarrier(process.env)),
      () => genLoaderHtmlBundle(args)
    );
    // The profiler keeps a long-poll open and can't be stopped, so force-exit
    // once stdout is flushed to avoid leaving the subprocess alive.
    process.stdout.write(html, () => process.exit(0));
  } catch (e) {
    process.stderr.write("" + e.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  const res = main();
}
