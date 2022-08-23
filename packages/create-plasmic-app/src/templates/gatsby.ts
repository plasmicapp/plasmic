import { CodeScheme } from "..";
import { ifTs } from "../utils/file-utils";

export const makeGatsbyDefaultPage = (format: "ts" | "js"): string => {
  const ts = format === "ts";
  return `
import React from "react";
import Helmet from "react-helmet";
import {
  PlasmicComponent,
  PlasmicRootProvider,${ifTs(
    ts,
    `
  InitOptions,
  ComponentRenderData,`
  )}
} from "@plasmicapp/loader-gatsby";
import { graphql${ifTs(ts, ", PageProps")} } from "gatsby";
import { initPlasmicLoaderWithRegistrations } from "../plasmic-init";

export const query = graphql\`
  query ($path: String) {
    plasmicComponents(componentNames: [$path])
    plasmicOptions
  }
\`;

${ifTs(
  ts,
  `interface PlasmicGatsbyPageProps extends PageProps {
  data: {
    plasmicOptions: InitOptions
    plasmicComponents: ComponentRenderData
  }
}
`
)}
const PlasmicGatsbyPage = ({ data, location }${ifTs(
    ts,
    ": PlasmicGatsbyPageProps"
  )}) => {
  const {
    plasmicComponents,
    plasmicOptions,
  } = data;
  const pageMeta = plasmicComponents.entryCompMetas[0];
  const pageMetadata = pageMeta.pageMetadata;
  return (
    <PlasmicRootProvider
      loader={initPlasmicLoaderWithRegistrations(plasmicOptions)}
      prefetchedData={plasmicComponents}
      pageParams={pageMeta.params}
      pageQuery={Object.fromEntries(new URLSearchParams(location.search))}
      Head={Helmet}
    >
      <Helmet>
        {pageMetadata?.title && <title>{pageMetadata.title}</title>}
        {pageMetadata?.title && <meta property="og:title" content={pageMetadata.title} /> }
        {pageMetadata?.description && <meta property="og:description" content={pageMetadata.description} />}
        {pageMetadata?.openGraphImageUrl && <meta property="og:image" content={pageMetadata.openGraphImageUrl} />}
      </Helmet>
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );
};

export default PlasmicGatsbyPage;
`.trim();
};

export const GATSBY_404 = `
const NotFound = () => {
  return "Not Found";
};
export default NotFound;
`.trim();

export const GATSBY_PLUGIN_CONFIG = (
  projectId: string,
  projectApiToken: string,
  useTypescript: boolean
): string => `
{
  resolve: "@plasmicapp/loader-gatsby",
  options: {
    projects: [
      {
        id: "${projectId}",
        token: "${projectApiToken}",
      },
    ], // An array of project ids.
    preview: false,
    defaultPlasmicPage: ${
      useTypescript ? "path" : "require"
    }.resolve("./src/templates/defaultPlasmicPage.${
  useTypescript ? "tsx" : "jsx"
}"),
  },
},
{
  resolve: "gatsby-plugin-react-helmet",
}
`;

export const makeGatsbyHostPage = (opts: {
  useTypescript: boolean;
  scheme: CodeScheme;
}): string => {
  const { useTypescript, scheme } = opts;
  if (scheme === "loader") {
    return `
import * as React from "react"
import {
  PlasmicCanvasHost${ifTs(useTypescript, `, InitOptions`)}
} from "@plasmicapp/loader-gatsby"
import { graphql } from "gatsby"
import { initPlasmicLoaderWithRegistrations } from "../plasmic-init"

export const query = graphql\`
  query {
    plasmicOptions
  }
\`

${ifTs(
  useTypescript,
  `interface HostProps {
  data: {
    plasmicOptions: InitOptions;
  }
}
`
)}
export default function Host({ data }${ifTs(useTypescript, ": HostProps")}) {
  const { plasmicOptions } = data
  initPlasmicLoaderWithRegistrations(plasmicOptions)
  return <PlasmicCanvasHost />
}
    `.trim();
  } else {
    return `
import * as React from "react"
import { PlasmicCanvasHost, registerComponent } from "@plasmicapp/host";

// You can register any code components that you want to use here; see
// https://docs.plasmic.app/learn/code-components-ref/
// And configure your Plasmic project to use the host url pointing at
// the /plasmic-host page of your nextjs app (for example,
// http://localhost:3000/plasmic-host).  See
// https://docs.plasmic.app/learn/app-hosting/#set-a-plasmic-project-to-use-your-app-host

// registerComponent(...)

export default function PlasmicHost() {
  return (
    <PlasmicCanvasHost />
  );
}
    `;
  }
};

export const GATSBY_SSR_CONFIG = `
/**
 * Implement Gatsby's SSR (Server Side Rendering) APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/ssr-apis/
 */

const React = require("react")

const HeadComponents = [
  <script
    key="plasmic-hmr"
    type="text/javascript"
    dangerouslySetInnerHTML={{
      __html: \`
        if (typeof window !== "undefined" && /\\\\/plasmic-host\\\\/?$/.test(window.location.pathname)) {
          const RealEventSource = window.EventSource;
          window.EventSource = function(url, config) {
            if (/[^a-zA-Z]hmr($|[^a-zA-Z])/.test(url)) {
              console.warn("Plasmic: disabled EventSource request for", url);
              return {
                onerror() {}, onmessage() {}, onopen() {}, close() {}
              };
            } else {
              return new RealEventSource(url, config);
            }
          }
        }
      \`,
    }}
  />
]

const isProduction = process.env.NODE_ENV === "production"

exports.onRenderBody = ({ pathname, setHeadComponents }) => {
  /**
   * We add the preamble tag script to all pages during development mode
   * because during development all pages are dynamically rendered based
   * on \`/\` route, during production we add it only in \`/plasmic-host/\`
   */
  if (!isProduction || pathname === "/plasmic-host/") {
    setHeadComponents(HeadComponents)
  }
}
`.trim();

export const makeGatsbyPlasmicInit = (format: "ts" | "js"): string => {
  const ts = format === "ts";
  return `
import {
  initPlasmicLoader,${ifTs(
    ts,
    `
  InitOptions,`
  )}
} from "@plasmicapp/loader-gatsby";

export function initPlasmicLoaderWithRegistrations(plasmicOptions${ifTs(
    ts,
    ": InitOptions"
  )}) {
  const PLASMIC = initPlasmicLoader(plasmicOptions);

  // You can register any code components that you want to use here; see
  // https://docs.plasmic.app/learn/code-components-ref/
  // And configure your Plasmic project to use the host url pointing at
  // the /plasmic-host page of your nextjs app (for example,
  // http://localhost:8000/plasmic-host).  See
  // https://docs.plasmic.app/learn/app-hosting/#set-a-plasmic-project-to-use-your-app-host

  // PLASMIC.registerComponent(...);

  return PLASMIC;
}
`.trim();
};

export function wrapAppRootForCodegen(): string {
  return `
import React from "react";
import { PlasmicRootProvider } from "@plasmicapp/react-web";
import Helmet from "react-helmet";

export const wrapRootElement = ({ element }) => {
  return (
    <PlasmicRootProvider Head={Helmet}>
      {element}
    </PlasmicRootProvider>
  );
}
  `;
}
