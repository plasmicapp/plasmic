import { LoaderBundleOutput } from '@plasmicapp/loader-core';

export function mergeBundles(
  target: LoaderBundleOutput,
  from: LoaderBundleOutput
) {
  const existingCompIds = new Set(target.components.map((c) => c.id));

  const newCompMetas = from.components.filter(
    (m) => !existingCompIds.has(m.id)
  );
  if (newCompMetas.length > 0) {
    target = { ...target, components: [...target.components, ...newCompMetas] };
  }

  const existingProjects = new Set(target.projects.map((p) => p.id));
  const newProjects = from.projects.filter((p) => !existingProjects.has(p.id));
  if (newProjects.length > 0) {
    target = {
      ...target,
      projects: [...target.projects, ...newProjects],
    };
  }

  const existingModules = new Set(target.modules.map((m) => m.fileName));
  const newModules = from.modules.filter(
    (m) => !existingModules.has(m.fileName)
  );
  if (newModules.length > 0) {
    target = { ...target, modules: [...target.modules, ...newModules] };
  }

  const existingGlobalIds = new Set(target.globalGroups.map((g) => g.id));
  const newGlobals = from.globalGroups.filter(
    (g) => !existingGlobalIds.has(g.id)
  );
  if (newGlobals.length > 0) {
    target = {
      ...target,
      globalGroups: [...target.globalGroups, ...newGlobals],
    };
  }

  const existingExternals = new Set(target.external);
  const newExternals = target.external.filter((x) => !existingExternals.has(x));
  if (newExternals.length > 0) {
    target = { ...target, external: [...target.external, ...newExternals] };
  }

  return target;
}
