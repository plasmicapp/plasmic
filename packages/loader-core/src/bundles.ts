import { LoaderBundleOutput } from './api';
import { DepsGraph } from './deps-graph';

export function getBundleSubset(
  bundle: LoaderBundleOutput,
  ...names: string[]
): LoaderBundleOutput {
  const graph = new DepsGraph(bundle);
  const deps = new Set(names.flatMap((name) => graph.getTransitiveDeps(name)));
  return {
    modules: bundle.modules.filter(
      (mod) => deps.has(mod.fileName) || names.includes(mod.fileName)
    ),
    external: bundle.external.filter((dep) => deps.has(dep)),
    components: bundle.components,
    globalGroups: bundle.globalGroups,
    projects: bundle.projects,
  };
}
