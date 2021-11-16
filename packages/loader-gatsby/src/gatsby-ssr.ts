import { initPlasmicLoader } from "@plasmicapp/loader-react";
import { renderToString } from "react-dom/server";
import type { GatsbyPluginOptions } from "./gatsby-node";

let loadedProjects = new Set<string>();

export async function fetchServerFiles(opts: GatsbyPluginOptions) {
  if (
    opts?.projects &&
    Array.isArray(opts.projects) &&
    opts.projects.every((p) => !!p.token && !!p.id)
  ) {
    const projectKeys = opts.projects.map(
      (project) => `${project.id}@${project.version}:${project.token}`
    );
    if (projectKeys.some((key) => !loadedProjects.has(key))) {
      loadedProjects.clear();
      const PLASMIC = initPlasmicLoader({
        projects: opts.projects,
        preview: opts.preview,
        host: opts.host,
        platform: "gatsby",
      });
      const components = await PLASMIC.fetchComponents();
      await PLASMIC.maybeFetchComponentData(...components);
      projectKeys.forEach((key) => loadedProjects.add(key));
    }
  }
}

export const replaceRenderer = async (
  { bodyComponent, replaceBodyHTMLString }: any,
  opts: GatsbyPluginOptions
) => {
  await fetchServerFiles(opts);
  replaceBodyHTMLString(renderToString(bodyComponent));
};
