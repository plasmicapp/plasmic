import {
  ComponentMeta,
  getBundleSubset,
  LoaderBundleOutput,
} from '@plasmicapp/loader-core';
import type { ComponentRenderData } from './loader';

function getUsedComps(allComponents: ComponentMeta[], entryCompIds: string[]) {
  const q: string[] = [...entryCompIds];
  const seenIds = new Set<string>(entryCompIds);
  const componentMetaById = new Map<string, ComponentMeta>(
    allComponents.map((meta) => [meta.id, meta])
  );
  const usedComps: ComponentMeta[] = [];
  while (q.length > 0) {
    const [id] = q.splice(0, 1);
    const meta = componentMetaById.get(id);
    if (!meta) {
      continue;
    }
    usedComps.push(meta);
    meta.usedComponents.forEach((usedCompId) => {
      if (!seenIds.has(usedCompId)) {
        seenIds.add(usedCompId);
        q.push(usedCompId);
      }
    });
  }
  return usedComps;
}

export function prepComponentData(
  bundle: LoaderBundleOutput,
  ...compMetas: ComponentMeta[]
): ComponentRenderData {
  if (compMetas.length === 0) {
    return {
      entryCompMetas: bundle.components,
      bundle: bundle,
      remoteFontUrls: [],
    };
  }

  const usedComps = getUsedComps(
    bundle.components,
    compMetas.map((compMeta) => compMeta.id)
  );
  const compPaths = usedComps.map((compMeta) => compMeta.entry);
  const subBundle = getBundleSubset(
    bundle,
    'entrypoint.css',
    ...compPaths,
    'root-provider.js',
    ...bundle.projects.map(x => x.globalContextsProviderFileName).filter(x => !!x),
    ...bundle.globalGroups.map((g) => g.contextFile)
  );

  const remoteFontUrls: string[] = [];
  subBundle.projects.forEach((p) =>
    remoteFontUrls.push(...p.remoteFonts.map((f) => f.url))
  );

  return {
    entryCompMetas: compMetas,
    bundle: subBundle,
    remoteFontUrls,
  };
}

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

  const existingModules = {
    browser: new Set(target.modules.browser.map((m) => m.fileName)),
    server: new Set(target.modules.server.map((m) => m.fileName)),
  };
  const newModules = {
    browser: from.modules.browser.filter(
      (m) => !existingModules.browser.has(m.fileName)
    ),
    server: from.modules.server.filter(
      (m) => !existingModules.server.has(m.fileName)
    ),
  };
  if (newModules.browser.length > 0 || newModules.server.length > 0) {
    target = {
      ...target,
      modules: {
        browser: [...target.modules.browser, ...newModules.browser],
        server: [...target.modules.server, ...newModules.server],
      },
    };
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

export const convertBundlesToComponentRenderData = (
  bundles: LoaderBundleOutput[],
  compMetas: ComponentMeta[]
): ComponentRenderData | null => {
  if (bundles.length === 0) {
    return null;
  }

  const mergedBundles = bundles.reduce((prev, cur) => mergeBundles(prev, cur));
  return prepComponentData(mergedBundles, ...compMetas);
};
