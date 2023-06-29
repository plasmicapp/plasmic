// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { PLASMIC } from "@/plasmic-init";
import {
  extractPlasmicQueryData,
  PlasmicComponent,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { render } from "@react-email/render";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const template = req.query.template;
  const plasmicPath =
    typeof template === "string"
      ? template
      : Array.isArray(template)
      ? `/${template.join("/")}`
      : "/";
  const plasmicData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!plasmicData) {
    // non-Plasmic catch-all
    throw new Error();
  }
  const pageMeta = plasmicData.entryCompMetas[0];
  // Cache the necessary data fetched for the page
  const queryCache = await extractPlasmicQueryData(
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      pageParams={pageMeta.params}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.write(
    renderToString(
      <PlasmicRootProvider
        loader={PLASMIC}
        prefetchedData={plasmicData}
        prefetchedQueryData={queryCache}
        pageParams={pageMeta.params}
        pageQuery={req.query}
      >
        <PlasmicComponent component={pageMeta.displayName} />
      </PlasmicRootProvider>
    )
  );
  res.end();
}
