import { Api } from "@/wab/client/api";
import { AppCtx } from "@/wab/client/app-ctx";
import { DbCtx } from "@/wab/client/db";
import {
  providesStudioCtx,
  StudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { FastBundler } from "@/wab/shared/bundler";
import { createSite } from "@/wab/shared/core/sites";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { Site } from "@/wab/shared/model/classes";
import { PkgInfo, SiteInfo } from "@/wab/shared/SharedApi";
import { createMemoryHistory } from "history";
import * as React from "react";

const site = createSite();
const fakeSiteInfo: Partial<SiteInfo> = {};
const fakeApi: Partial<Api> = {
  async getPkgByProjectId(_projectId: string): Promise<{ pkg?: PkgInfo }> {
    return {};
  },
  getStorageItem(key: string): string {
    return `getStorageItem(${key})`;
  },
};
const fakeAppCtx: Partial<AppCtx> = {
  // @ts-expect-error: partial fake
  api: fakeApi,
  appConfig: DEVFLAGS,
  history: createMemoryHistory(),
};
const fakeBundler: Partial<FastBundler> = {
  allIidsByUuid(_uuid: string): string[] {
    return [];
  },
};
const fakeDbCtx: Partial<DbCtx> = {
  get appCtx(): AppCtx {
    // @ts-expect-error: partial fake
    return fakeAppCtx;
  },
  bundler(): FastBundler {
    // @ts-expect-error: partial fake
    return fakeBundler;
  },
  get site(): Site {
    return site;
  },
  get siteInfo(): SiteInfo {
    // @ts-expect-error: partial fake
    return fakeSiteInfo;
  },
};
const fakeStudioCtx = new StudioCtx({
  // @ts-expect-error: partial fake
  dbCtx: fakeDbCtx,
  // Stories never persist anything, the timer would just poll the fake api.
  autoSave: false,
});

export const StudioCtxDecorator = (Story: React.ComponentType) => {
  return providesStudioCtx(fakeStudioCtx)(<Story />);
};
