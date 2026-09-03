import { TplMgr } from "@/wab/shared/TplMgr";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import { Bundler } from "@/wab/shared/bundler";
import { Bundle } from "@/wab/shared/bundles";
import {
  Component,
  CustomFunction,
  Site,
  isKnownProjectDependency,
  isKnownSite,
} from "@/wab/shared/model/classes";

/**
 * Generates a site object from bundle data of a project with dependencies.
 */
export function generateSiteFromBundle(
  bundleWithDeps: [string, Bundle][]
): Site {
  let site: Site | undefined;
  const bundler = new Bundler();

  for (const bundle of bundleWithDeps as [string, Bundle][]) {
    const unbundled = bundler.unbundle(bundle[1], bundle[0]);
    if (isKnownSite(unbundled)) {
      site = unbundled;
    } else if (isKnownProjectDependency(unbundled)) {
      site = unbundled.site;
    }
  }

  if (!site) {
    throw new Error("Could not extract site from bundle");
  }

  return site;
}

/**
 * Builds a minimal `CustomFunction`. Defaults to a query function with no namespace.
 */
export function mkCustomFunction(opts: {
  importName: string;
  importPath?: string;
  namespace?: string | null;
  displayName?: string | null;
  isQuery?: boolean;
  isMutation?: boolean;
}): CustomFunction {
  return new CustomFunction({
    importPath: opts.importPath ?? "test",
    importName: opts.importName,
    defaultExport: false,
    namespace: opts.namespace ?? null,
    displayName: opts.displayName ?? null,
    params: [],
    isQuery: opts.isQuery ?? true,
    isMutation: opts.isMutation ?? false,
  });
}

export const createTplMgr = (site: Site) => new TplMgr({ site });

const emptyVariants = {
  getTargetVariants: () => [],
  getPinnedVariants: () => new Map(),
};

/**
 * @param component - When provided, the frame stack is bound to this real
 *   component, so vtm operations that look up a tpl's containing frame (e.g.
 *   ensureCurrentVariantSetting) work for tpls in its tree. Otherwise a fake
 *   "jest-root" stub is used, which only supports frame-independent operations.
 */
export const createVariantTplMgr = (
  site: Site,
  tplMgr: TplMgr,
  component?: Component
) => {
  return new VariantTplMgr(
    [
      {
        // @ts-ignore
        component: component ?? {
          name: "jest-root",
          variants: [],
        },
        ...emptyVariants,
      },
    ],
    site,
    tplMgr,
    emptyVariants
  );
};
