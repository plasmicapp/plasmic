import { mockDeepAuto } from "@/test/mock";
import { AppCtx } from "@/wab/client/app-ctx";
import { CanvasCtx } from "@/wab/client/components/canvas/canvas-ctx";
import { App } from "@/wab/client/components/top-view";
import { DbCtx } from "@/wab/client/db";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewportCtx } from "@/wab/client/studio-ctx/ViewportCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { fakePromisifiedApi } from "@/wab/client/test/FakeApi";
import { ApiTeam } from "@/wab/shared/ApiSchema";
import { SiteInfo } from "@/wab/shared/SharedApi";
import { FastBundler } from "@/wab/shared/bundler";
import { createSite } from "@/wab/shared/core/sites";
import { DEVFLAGS, DevFlagsType } from "@/wab/shared/devflags";
import { ArenaFrame, Site } from "@/wab/shared/model/classes";
import { createMemoryHistory } from "history";

export function fakeApp() {
  const app = mockDeepAuto<App>();
  app.withSpinner.mockImplementation(async (task) => {
    return await task;
  });
  return app;
}

export function fakeAppCtx(opts?: {
  devFlagOverrides?: Partial<DevFlagsType>;
  teams?: ApiTeam[];
}) {
  const api = fakePromisifiedApi();
  const app = fakeApp();
  const history = createMemoryHistory();

  // @ts-expect-error
  const appCtx = new AppCtx({
    api,
    app,
    appConfig: { ...DEVFLAGS, ...(opts?.devFlagOverrides || {}) },
    bundler: new FastBundler(),
    history,
    teams: opts?.teams ?? [],
    workspaces: [],
  });

  return {
    appCtx,
    api,
    app,
    history,
  };
}

export function fakeDbCtx(opts?: {
  site?: Site;
  devFlagOverrides?: Partial<DevFlagsType>;
  teams?: ApiTeam[];
  siteInfo?: Partial<SiteInfo>;
}) {
  const appCtxDeps = fakeAppCtx({
    devFlagOverrides: opts?.devFlagOverrides,
    teams: opts?.teams,
  });
  // @ts-expect-error
  const dbCtx = new DbCtx({
    app: appCtxDeps.app,
    appCtx: appCtxDeps.appCtx,
    site: opts?.site ?? createSite(),
    siteInfo: {
      id: "ProjectId123",
      name: "Test Site",
      perms: [],
      ...opts?.siteInfo,
    } as SiteInfo,
  });
  return {
    dbCtx,
    ...appCtxDeps,
  };
}

export function fakeStudioCtx(opts?: {
  site?: Site;
  devFlagOverrides?: Partial<DevFlagsType>;
  teams?: ApiTeam[];
  siteInfo?: Partial<SiteInfo>;
}) {
  const dbCtxDeps = fakeDbCtx(opts);
  const studioCtx = new StudioCtx({
    dbCtx: dbCtxDeps.dbCtx,
  });

  studioCtx.tryGetViewCtxForFrame = (frame: ArenaFrame | undefined) => {
    if (!frame) {
      return undefined;
    }

    const existingViewCtx = studioCtx.viewCtxs.find(
      (viewCtx) => viewCtx.arenaFrame() === frame
    );
    if (existingViewCtx) {
      return existingViewCtx;
    }

    const newViewCtx = new ViewCtx({
      studioCtx,
      arenaFrame: frame,
      canvasCtx: mockDeepAuto<CanvasCtx>(),
      viewportCtx: mockDeepAuto<ViewportCtx>(),
    });
    studioCtx.viewCtxs.push(newViewCtx);
    return newViewCtx;
  };

  return { studioCtx, ...dbCtxDeps };
}
