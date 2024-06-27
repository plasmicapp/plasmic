import { mockDeepAuto } from "@/test/mock";
import { AppCtx } from "@/wab/client/app-ctx";
import { CanvasCtx } from "@/wab/client/components/canvas/canvas-ctx";
import { App } from "@/wab/client/components/top-view";
import { DbCtx } from "@/wab/client/db";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewportCtx } from "@/wab/client/studio-ctx/ViewportCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { fakePromisifiedApi } from "@/wab/client/test/FakeApi";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { SiteInfo } from "@/wab/shared/SharedApi";
import { FastBundler } from "@/wab/shared/bundler";
import { ArenaFrame } from "@/wab/shared/model/classes";
import { createSite } from "@/wab/shared/core/sites";
import { createMemoryHistory } from "history";

export function fakeApp() {
  const app = mockDeepAuto<App>();
  app.withSpinner.mockImplementation(async (task) => {
    return await task;
  });
  return app;
}

export function fakeAppCtx() {
  const api = fakePromisifiedApi();
  const app = fakeApp();
  const history = createMemoryHistory();

  // @ts-expect-error
  const appCtx = new AppCtx({
    api,
    app,
    appConfig: DEVFLAGS,
    bundler: new FastBundler(),
    history,
  });

  return {
    appCtx,
    api,
    app,
    history,
  };
}

export function fakeDbCtx() {
  const appCtxDeps = fakeAppCtx();
  // @ts-expect-error
  const dbCtx = new DbCtx({
    app: appCtxDeps.app,
    appCtx: appCtxDeps.appCtx,
    site: createSite(),
    siteInfo: {
      id: "ProjectId123",
      name: "Test Site",
    } as SiteInfo,
  });
  return {
    dbCtx,
    ...appCtxDeps,
  };
}

export function fakeStudioCtx() {
  const dbCtxDeps = fakeDbCtx();
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
