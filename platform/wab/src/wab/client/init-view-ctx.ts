import { meta } from "@/wab/classes-metas";
import { AppCtx } from "@/wab/client/app-ctx";
import { DbCtx } from "@/wab/client/db";
import { loadSiteDbCtx } from "@/wab/client/init-ctx";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { observeModel } from "@/wab/observable-model";
import { SiteInfo } from "@/wab/shared/SharedApi";
import * as mobx from "mobx";

(window as any).mobx = mobx;
(window as any).meta = meta;
(window as any).observeModel = observeModel;

export function createStudioCtx({
  dbCtx,
}: {
  dbCtx: DbCtx;
  siteInfo: SiteInfo;
}) {
  const studioCtx =
    ((window as any).studioCtx =
    (window as any).dbg.studioCtx =
      new StudioCtx({
        dbCtx,
      }));

  (window as any).__PLASMIC_EXECUTE_DATA_OP = studioCtx.executePlasmicDataOp;
  (window as any).__PLASMIC_MUTATE_DATA_OP =
    studioCtx.refreshFetchedDataFromPlasmicQuery;
  (window as any).__PLASMIC_GET_ALL_CACHE_KEYS =
    studioCtx.getAllDataOpCacheKeys;
  (window as any).__PLASMIC_STUDIO_PATH = studioCtx.getCurrentPathName;

  return studioCtx;
}

export async function initStudioCtx(
  appCtx: AppCtx,
  siteId: string,
  onRefreshUi
) {
  const dbCtx = await loadSiteDbCtx(appCtx, onRefreshUi, siteId);
  const { siteInfo } = dbCtx;

  return createStudioCtx({
    dbCtx,
    siteInfo,
  });
}
