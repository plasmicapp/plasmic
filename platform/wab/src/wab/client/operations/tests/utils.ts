import { TplMgr } from "@/wab/shared/TplMgr";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { createSite } from "@/wab/shared/core/sites";
import * as Tpls from "@/wab/shared/core/tpls";
import { TplTag } from "@/wab/shared/model/classes";
import { createVariantTplMgr } from "@/wab/shared/tests/site-tests-utils";

export function setupComponentWithTplTree(tplTree: TplTag) {
  const component = mkComponent({
    tplTree,
    type: ComponentType.Plain,
  });
  const site = createSite();
  site.components.push(component);
  Tpls.trackComponentSite(component, site);
  Tpls.trackComponentRoot(component);
  const tplMgr = new TplMgr({ site });
  const vtm = createVariantTplMgr(site, tplMgr);
  return { component, site, tplMgr, vtm };
}
