import { LoaderBundleOutput } from '@plasmicapp/loader-fetcher';
import { DepsGraph } from './deps-graph';

// Get sub-bundle including only modules from browser build that are reachable
// from `names`.
export function getBundleSubset(
  bundle: LoaderBundleOutput,
  ...names: string[]
): LoaderBundleOutput {
  const namesSet = new Set(names);
  const graph = new DepsGraph(bundle);
  const deps = new Set(names.flatMap((name) => graph.getTransitiveDeps(name)));
  const isSubModule = (fileName: string) =>
    deps.has(fileName) || namesSet.has(fileName);
  return {
    modules: {
      browser: bundle.modules.browser.filter((mod) =>
        isSubModule(mod.fileName)
      ),
      server: [],
    },
    external: bundle.external.filter((dep) => deps.has(dep)),
    components: bundle.components.filter((c) => isSubModule(c.entry)),
    globalGroups: bundle.globalGroups,
    projects: bundle.projects,
    activeSplits: bundle.activeSplits,
  };
}
