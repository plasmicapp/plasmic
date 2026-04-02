import { TplMgr } from "@/wab/shared/TplMgr";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import { Bundler } from "@/wab/shared/bundler";
import { Bundle } from "@/wab/shared/bundles";
import {
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

export const createTplMgr = (site: Site) => new TplMgr({ site });

const emptyVariants = {
  getTargetVariants: () => [],
  getPinnedVariants: () => {},
};

export const createVariantTplMgr = (site: Site, tplMgr: TplMgr) => {
  return new VariantTplMgr(
    [
      {
        // @ts-ignore
        component: {
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
