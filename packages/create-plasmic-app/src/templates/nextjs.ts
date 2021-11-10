export const makeNextjsInitPage = (
  projectId: string,
  projectApiToken: string
): string =>
  `
import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "${projectId}",
      token: "${projectApiToken}",
    },
  ],

  // By default Plasmic will use the last published version of your project.
  // For development, you can set preview to true, which will use the unpublished
  // project, allowing you to see your designs without publishing.  Please
  // only use this for development, as this is significantly slower.
  preview: false,
});

// You can register any code components that you want to use here; see
// https://docs.plasmic.app/learn/code-components-ref/
// And configure your Plasmic project to use the host url pointing at
// the /plasmic-host page of your nextjs app (for example,
// http://localhost:3000/plasmic-host).  See
// https://docs.plasmic.app/learn/app-hosting/#set-a-plasmic-project-to-use-your-app-host

// PLASMIC.registerComponent(...);
`.trim();

function ifTs(ts: boolean, str: string) {
  return ts ? str : "";
}

export function makeNextjsCatchallPage(format: "ts" | "js"): string {
  const ts = format === "ts";
  return `
import * as React from "react";
import { PlasmicComponent } from "@plasmicapp/loader-nextjs";
${ifTs(ts, `import { GetStaticPaths, GetStaticProps } from "next";\n`)}
import {
  ComponentRenderData,
  PlasmicRootProvider,
} from "@plasmicapp/loader-react";
import Error from "next/error";
import { PLASMIC } from "../plasmic-init";

export default function PlasmicLoaderPage(props${ifTs(
    ts,
    `: {
  plasmicData?: ComponentRenderData;
}`
  )}) {
  const { plasmicData } = props;
  if (!plasmicData || plasmicData.entryCompMetas.length === 0) {
    return <Error statusCode={404} />;
  }
  return (
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
    >
      <PlasmicComponent component={plasmicData.entryCompMetas[0].name} />
    </PlasmicRootProvider>
  );
}

export const getStaticProps${ifTs(
    ts,
    `: GetStaticProps`
  )} = async (context) => {
  const { catchall } = context.params ?? {};
  const plasmicPath = typeof catchall === 'string' ? catchall : Array.isArray(catchall) ? \`/\${catchall.join('/')}\` : '/';
  const plasmicData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (plasmicData) {
    return {
      props: { plasmicData },

      // Use revalidate if you want incremental static regeneration
      revalidate: 60
    };
  }
  return {
    // non-Plasmic catch-all
    props: {},
  };
}

export const getStaticPaths${ifTs(ts, `: GetStaticPaths`)} = async () => {
  const pageModules = await PLASMIC.fetchPages();
  return {
    paths: pageModules.map((mod) => ({
      params: {
        catchall: mod.path.substring(1).split("/"),
      },
    })),
    fallback: "blocking"
  };
}
  `.trim();
}

export function makeNextjsHostPage(): string {
  return `
import * as React from 'react';
import { PlasmicCanvasHost } from '@plasmicapp/loader-nextjs';
import Script from 'next/script';
import { PLASMIC } from '../plasmic-init';

export default function Host() {
  return PLASMIC && (
    <div>
      <Script
        src="https://static1.plasmic.app/preamble.js"
        strategy="beforeInteractive"
      />
      <PlasmicCanvasHost />
    </div>
  );
}
  `.trim();
}
