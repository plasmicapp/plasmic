import { LoaderBundleOutput } from './api';
import { DepsGraph } from './deps-graph';

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
    modules: bundle.modules.filter((mod) => isSubModule(mod.fileName)),
    external: bundle.external.filter((dep) => deps.has(dep)),
    components: bundle.components.filter(
      (c) => isSubModule(c.entry)
    ),
    globalGroups: bundle.globalGroups,
    projects: bundle.projects,
  };
}
