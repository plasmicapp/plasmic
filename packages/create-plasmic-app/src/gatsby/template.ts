import { ifTs } from "../utils/file-utils";
import { JsOrTs, SchemeType } from "../utils/types";

export function makeGatsbyDefaultPage(jsOrTs: JsOrTs): string {
  return `import React from "react";
import Helmet from "react-helmet";
import {
  PlasmicComponent,
  PlasmicRootProvider,${ifTs(
    jsOrTs,
    `
  InitOptions,
  ComponentRenderData,`
  )}
} from "@plasmicapp/loader-gatsby";
import { graphql${ifTs(jsOrTs, ", PageProps")} } from "gatsby";
import { initPlasmicLoaderWithRegistrations } from "../plasmic-init";

export const query = graphql\`
  query ($path: String) {
    plasmicComponents(componentNames: [$path])
    plasmicOptions
  }
\`;

${ifTs(
  jsOrTs,
  `export interface PlasmicGatsbyPageProps extends PageProps {
  data: {
    plasmicOptions: InitOptions
    plasmicComponents: ComponentRenderData
  }
  pageContext: {
    queryCache?: Record<string, any>
  }
}
`
)}
const PlasmicGatsbyPage = ({ data, location, pageContext }${ifTs(
    jsOrTs,
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
      prefetchedQueryData={pageContext.queryCache}
      pageRoute={pageMeta.path}
      pageParams={pageMeta.params}
      pageQuery={Object.fromEntries(new URLSearchParams(location.search))}
      trackQueryParams
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
`;
}

export const GATSBY_404 = `const NotFound = () => {
  return "Not Found";
};
export default NotFound;
`;

export function makeGatsbyConfig(
  projectId: string,
  projectApiToken: string,
  jsOrTs: JsOrTs
): string {
  return `${
    jsOrTs === "ts"
      ? `import path from "path";
import type { GatsbyConfig } from "gatsby";`
      : `const path = require("path");`
  }

${
  jsOrTs === "ts" ? `` : `/** @type {import("gatsby").GatsbyConfig} */\n`
}const config${ifTs(jsOrTs, `: GatsbyConfig`)} = {
  siteMetadata: {
    siteUrl: \`https://www.yourdomain.tld\`,
  },
  graphqlTypegen: true,
  plugins: [
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
        defaultPlasmicPage: path.resolve("./src/templates/defaultPlasmicPage.${jsOrTs}x"),
      },
    },
    {
      resolve: "gatsby-plugin-react-helmet",
    },
  ],
};

${jsOrTs === "ts" ? `export default config` : `module.exports = config`};
`;
}

export function makeGatsbyNode(jsOrTs: JsOrTs): string {
  return `/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/node-apis/
 *
 * \`onCreatePage\` runs \`extractPlasmicQueryData\` at build time so that the
 * SSG'd HTML for each Plasmic page contains its actual rendered content,
 * rather than the \`<Suspense fallback>\` ("Loading...") of unresolved data
 * queries.
 */
${
  jsOrTs === "ts"
    ? `import type { CreatePageArgs } from "gatsby";
import * as React from "react";
import {
  extractPlasmicQueryData,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-gatsby";
import type { GatsbyPluginOptions } from "@plasmicapp/loader-gatsby";
import gatsbyConfig from "./gatsby-config";
import { initPlasmicLoaderWithRegistrations } from "./src/plasmic-init";
import type { PlasmicGatsbyPageProps } from "./src/templates/defaultPlasmicPage";`
    : `const React = require("react");
const {
  extractPlasmicQueryData,
  PlasmicComponent,
  PlasmicRootProvider,
} = require("@plasmicapp/loader-gatsby");
const gatsbyConfig = require("./gatsby-config");
const { initPlasmicLoaderWithRegistrations } = require("./src/plasmic-init");`
}

const plasmicLoaderOptions = gatsbyConfig.plugins.find(
  (p) => p && p.resolve === "@plasmicapp/loader-gatsby"
)${ifTs(jsOrTs, `!`)}.options${ifTs(jsOrTs, ` as GatsbyPluginOptions`)};
const PLASMIC = initPlasmicLoaderWithRegistrations(plasmicLoaderOptions);

${
  jsOrTs === "ts" ? `export const onCreatePage =` : `exports.onCreatePage =`
} async ({ page, actions }${ifTs(
    jsOrTs,
    `: CreatePageArgs<PlasmicGatsbyPageProps["pageContext"]>`
  )}) => {
  if (page.component !== plasmicLoaderOptions.defaultPlasmicPage) {
    return;
  }
  if (page.context?.queryCache) {
    return;
  }

  const componentData = await PLASMIC.maybeFetchComponentData(page.path);
  if (!componentData) {
    return;
  }
  const meta = componentData.entryCompMetas[0];

  const queryCache = await extractPlasmicQueryData(
    React.createElement(
      PlasmicRootProvider,
      {
        loader: PLASMIC,
        prefetchedData: componentData,
        pageRoute: meta.path,
        pageParams: meta.params,
        pageQuery: {},
      },
      React.createElement(PlasmicComponent, { component: meta.displayName })
    )
  );

  actions.deletePage(page);
  actions.createPage({
    ...page,
    context: { ...page.context, queryCache },
  });
};
`;
}

export function makeGatsbyHostPage(opts: {
  jsOrTs: JsOrTs;
  scheme: SchemeType;
}): string {
  const { jsOrTs, scheme } = opts;
  if (scheme === "loader") {
    return `import * as React from "react"
import {
  PlasmicCanvasHost${ifTs(jsOrTs, `, InitOptions`)}
} from "@plasmicapp/loader-gatsby"
import { graphql } from "gatsby"
import { initPlasmicLoaderWithRegistrations } from "../plasmic-init"

export const query = graphql\`
  query {
    plasmicOptions
  }
\`

${ifTs(
  jsOrTs,
  `interface HostProps {
  data: {
    plasmicOptions: InitOptions;
  }
}
`
)}
export default function Host({ data }${ifTs(jsOrTs, ": HostProps")}) {
  const { plasmicOptions } = data
  initPlasmicLoaderWithRegistrations(plasmicOptions)
  return <PlasmicCanvasHost />
}
`;
  } else {
    return `import * as React from "react"
import { PlasmicCanvasHost, registerComponent } from "@plasmicapp/react-web/lib/host";

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
}

export const GATSBY_SSR_CONFIG = `/**
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
`;

export function makeGatsbyPlasmicInit(jsOrTs: JsOrTs): string {
  return `${
    jsOrTs === "ts"
      ? `import {
  initPlasmicLoader,
  InitOptions,
} from "@plasmicapp/loader-gatsby";`
      : `const { initPlasmicLoader } = require("@plasmicapp/loader-gatsby");`
  }

${ifTs(
  jsOrTs,
  `export `
)}function initPlasmicLoaderWithRegistrations(plasmicOptions${ifTs(
    jsOrTs,
    `: InitOptions`
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
${
  jsOrTs === "ts"
    ? ``
    : `\nmodule.exports = { initPlasmicLoaderWithRegistrations };\n`
}`;
}

export function wrapAppRootForCodegen(): string {
  return `import React from "react";
import { PlasmicRootProvider } from "@plasmicapp/react-web";
import { Link } from "gatsby";
import Helmet from "react-helmet";

export const wrapRootElement = ({ element }) => {
  return (
    <PlasmicRootProvider Head={Helmet} Link={Link}>
      {element}
    </PlasmicRootProvider>
  );
}
`;
}
