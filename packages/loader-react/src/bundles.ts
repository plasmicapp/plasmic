import {
  ComponentMeta,
  getBundleSubset,
  LoaderBundleOutput,
} from "@plasmicapp/loader-core";
import type { ComponentRenderData } from "./loader-shared";
import { intersect } from "./utils";

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
  compMetas: ComponentMeta[],
  opts?: {
    target?: "browser" | "server";
  }
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
    [
      "entrypoint.css",
      ...compPaths,
      "root-provider.js",
      ...bundle.projects
        .map((x) => x.globalContextsProviderFileName)
        .filter((x) => !!x),
      // We need to explicitly include global context provider components
      // to make sure they are kept in bundle.components. That's because
      // for esbuild, just the globalContextsProviderFileName is not enough,
      // because it will import a chunk that includes the global context
      // component, instead of importing that global context component's
      // entry file. And because nothing depends on the global context component's
      // entry file, we end up excluding the global context component from
      // bundle.components, which then makes its substitution not work.
      // Instead, we forcibly include it here (we'll definitely need it anyway!).
      ...bundle.components
        .filter((c) => c.isGlobalContextProvider)
        .map((c) => c.entry),
      ...bundle.globalGroups.map((g) => g.contextFile),
    ],
    opts
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
  const existingProjects = new Set(target.projects.map((p) => p.id));
  const newProjects = from.projects.filter((p) => !existingProjects.has(p.id));
  if (newProjects.length > 0) {
    target = {
      ...target,
      projects: [...target.projects, ...newProjects],
    };
  }

  const existingCompIds = new Set(target.components.map((c) => c.id));

  function shouldIncludeComponentInBundle(c: ComponentMeta) {
    // If the component is already present in the target bundle, don't include it
    if (existingCompIds.has(c.id)) {
      return false;
    }
    // If the component belongs to a project that is not present in the target bundle,
    // include it
    if (!existingProjects.has(c.projectId)) {
      return true;
    }
    // If the component is present in the filteredIds of the project it belongs to,
    // in the target bundle, we consider that the component was not deleted in the target
    // bundle, so we can include it
    const targetBundleFilteredIds = target.filteredIds[c.projectId] ?? [];
    return targetBundleFilteredIds.includes(c.id);
  }

  const newCompMetas = from.components.filter((m) =>
    shouldIncludeComponentInBundle(m)
  );
  if (newCompMetas.length > 0) {
    target = {
      ...target,
      components: [...target.components, ...newCompMetas],
    };

    from.projects.forEach((fromProject) => {
      const projectId = fromProject.id;
      const fromBundleFilteredIds = from.filteredIds[projectId] ?? [];
      if (!existingProjects.has(projectId)) {
        target.filteredIds[projectId] = [...fromBundleFilteredIds];
      } else {
        target.filteredIds[projectId] = intersect(
          target.filteredIds[projectId] ?? [],
          fromBundleFilteredIds
        );
      }
    });
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

  const existingSplitIds = new Set(target.activeSplits.map((s) => s.id));
  const newSplits =
    from.activeSplits.filter(
      // Don't include splits belonging to projects already present
      // in the target bundle
      (s) => !existingSplitIds.has(s.id) && !existingProjects.has(s.projectId)
    ) ?? [];
  if (newSplits.length > 0) {
    target = {
      ...target,
      activeSplits: [...target.activeSplits, ...newSplits],
    };
  }

  // Avoid `undefined` as it cannot be serialized as JSON
  target.bundleKey = target.bundleKey ?? from.bundleKey ?? null;
  target.deferChunksByDefault =
    target.deferChunksByDefault ?? from.deferChunksByDefault ?? false;

  target.disableRootLoadingBoundaryByDefault =
    target.disableRootLoadingBoundaryByDefault ??
    from.disableRootLoadingBoundaryByDefault ??
    false;

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
  return prepComponentData(mergedBundles, compMetas);
};
