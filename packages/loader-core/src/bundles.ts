import { LoaderBundleOutput } from "@plasmicapp/loader-fetcher";
import { DepsGraph } from "./deps-graph";

/**
 * Get sub-bundle including only modules that are reachable from `names`.
 * @param opts.target by default, will target the browser modules. Can request
 *   the server modules instead.
 */
export function getBundleSubset(
  bundle: LoaderBundleOutput,
  names: string[],
  opts?: {
    target?: "browser" | "server";
  }
): LoaderBundleOutput {
  const namesSet = new Set(names);
  const target = opts?.target ?? "browser";

  const forBrowser = target === "browser";
  const graph = new DepsGraph(bundle, forBrowser);
  const deps = new Set(names.flatMap((name) => graph.getTransitiveDeps(name)));
  const isSubModule = (fileName: string) =>
    deps.has(fileName) || namesSet.has(fileName);
  const modules = bundle.modules[target];
  const filteredModules = modules.filter((mod) => isSubModule(mod.fileName));
  return {
    modules: {
      browser: forBrowser ? filteredModules : [],
      server: forBrowser ? [] : filteredModules,
    },
    external: bundle.external.filter((dep) => deps.has(dep)),
    components: bundle.components.filter((c) => isSubModule(c.entry)),
    globalGroups: bundle.globalGroups,
    projects: bundle.projects,
    activeSplits: bundle.activeSplits,
    bundleUrlQuery: bundle.bundleUrlQuery ?? null,
  };
}
