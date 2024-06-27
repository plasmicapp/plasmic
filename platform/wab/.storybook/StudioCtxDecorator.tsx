import { Api } from "@/wab/client/api";
import { AppCtx } from "@/wab/client/app-ctx";
import { Clipboard } from "@/wab/client/clipboard";
import { DbCtx } from "@/wab/client/db";
import {
  providesStudioCtx,
  StudioCtx,
} from "@/wab/client/studio-ctx/StudioCtx";
import { FastBundler } from "@/wab/shared/bundler";
import { createDefaultTheme } from "@/wab/shared/core/sites";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { Site } from "@/wab/shared/model/classes";
import { PkgInfo, SiteInfo } from "@/wab/shared/SharedApi";
import { mkScreenVariantGroup } from "@/wab/shared/SpecialVariants";
import { mkBaseVariant } from "@/wab/shared/Variants";
import { createMemoryHistory } from "history";
import * as React from "react";

const defaultTheme = createDefaultTheme();
const screenGroup = mkScreenVariantGroup();
const site = new Site({
  componentArenas: [],
  pageArenas: [],
  components: [],
  arenas: [],
  globalVariant: mkBaseVariant(),
  styleTokens: [],
  mixins: [],
  themes: [defaultTheme],
  activeTheme: defaultTheme,
  globalVariantGroups: [screenGroup],
  userManagedFonts: [],
  imageAssets: [],
  projectDependencies: [],
  activeScreenVariantGroup: screenGroup,
  flags: {
    usePlasmicImg: true,
    useLoadingState: true,
  },
  hostLessPackageInfo: null,
  globalContexts: [],
  splits: [],
  defaultComponents: {},
  defaultPageRoleId: null,
  pageWrapper: null,
  customFunctions: [],
  codeLibraries: [],
});
const fakeSiteInfo: Partial<SiteInfo> = {};
const fakeApi: Partial<Api> = {
  async getPkgByProjectId(projectId: string): Promise<{ pkg?: PkgInfo }> {
    return {};
  },
  getStorageItem(key: string): string {
    return `getStorageItem(${key})`;
  },
};
const fakeAppCtx: Partial<AppCtx> = {
  // @ts-expect-error
  api: fakeApi,
  appConfig: DEVFLAGS,
  history: createMemoryHistory(),
};
const fakeBundler: Partial<FastBundler> = {
  allIidsByUuid(uuid: string): string[] {
    return [];
  },
};
const fakeDbCtx: Partial<DbCtx> = {
  get appCtx(): AppCtx {
    // @ts-expect-error
    return fakeAppCtx;
  },
  bundler(): FastBundler {
    // @ts-expect-error
    return fakeBundler;
  },
  get site(): Site {
    return site;
  },
  get siteInfo(): SiteInfo {
    // @ts-expect-error
    return fakeSiteInfo;
  },
};
const fakeStudioCtx = new StudioCtx({
  // @ts-expect-error
  dbCtx: fakeDbCtx,
  clipboard: new Clipboard(),
});

export const StudioCtxDecorator = (Story: React.ComponentType) => {
  return providesStudioCtx(fakeStudioCtx)(<Story />);
};
