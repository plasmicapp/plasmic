import { mockDeepAuto } from "@/test/mock";
import { Api } from "@/wab/client/api";
import { AppCtx } from "@/wab/client/app-ctx";
import { CanvasCtx } from "@/wab/client/components/canvas/canvas-ctx";
import { App } from "@/wab/client/components/top-view";
import { DbCtx } from "@/wab/client/db";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewportCtx } from "@/wab/client/studio-ctx/ViewportCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { PromisifyMethods } from "@/wab/commons/promisify-methods";
import { svgoProcess } from "@/wab/server/svgo";
import { ApiTeam } from "@/wab/shared/ApiSchema";
import { SiteInfo } from "@/wab/shared/SharedApi";
import { FastBundler } from "@/wab/shared/bundler";
import { createSite } from "@/wab/shared/core/sites";
import { DEVFLAGS, DevFlagsType } from "@/wab/shared/devflags";
import {
  ArenaFrame,
  Component,
  Site,
  TplNode,
} from "@/wab/shared/model/classes";
import { createMemoryHistory } from "history";
import { mock } from "vitest-mock-extended";

function fakePromisifiedApi() {
  const fakeApi = mock<PromisifyMethods<Api>>();
  fakeApi.getPkgByProjectId.mockImplementation(async (_projectId) => {
    return {};
  });
  fakeApi.processSvg.mockImplementation(async (data) => {
    return svgoProcess(data.svgXml);
  });

  const storage: { [key: string]: string } = {};
  fakeApi.addStorageItem.mockImplementation(async (key, value) => {
    storage[key] = value;
  });
  fakeApi.getStorageItem.mockImplementation(async (key) => {
    return storage[key] ?? null;
  });
  fakeApi.removeStorageItem.mockImplementation(async (key) => {
    delete storage[key];
  });

  return fakeApi;
}

function fakeApp() {
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

function fakeDbCtx(opts?: {
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
      // There's no logged-in user in tests (appCtx.selfInfo is unset), so make this
      // editable by anonymous users, ownerless and public. Otherwise StudioCtx blocks
      // changes and undoes them async after the test has already asserted on them.
      createdById: null,
      readableByPublic: true,
      ...opts?.siteInfo,
    } as SiteInfo,
  });
  return {
    dbCtx,
    ...appCtxDeps,
  };
}

/**
 * StudioCtxs keep evaluating the canvas in the background, so dispose once tests are
 * done. Otherwise it outlives the test env, and vitest reports its logging.
 */
const undisposedStudioCtxs: StudioCtx[] = [];
afterAll(() => {
  undisposedStudioCtxs.splice(0).forEach((studioCtx) => studioCtx.dispose());
});

export function fakeStudioCtx(opts?: {
  site?: Site;
  devFlagOverrides?: Partial<DevFlagsType>;
  teams?: ApiTeam[];
  siteInfo?: Partial<SiteInfo>;
}) {
  const dbCtxDeps = fakeDbCtx(opts);
  const studioCtx = new StudioCtx({
    dbCtx: dbCtxDeps.dbCtx,
    // Tests never persist anything, the timer would just poll the mocked api.
    autoSave: false,
  });
  undisposedStudioCtxs.push(studioCtx);

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

/**
 * Stubs studioCtx.withBackgroundViewCtxForComponent to override canvas env per component
 * or Tpl without setting up a full ViewCtx. The fake ViewCtx is never stale and syncs
 * immediately, so waitForCanvasEnvSettled only waits on pending query promises in the env.
 *
 * Pass `noViewCtx: true` to simulate a component with no resolvable arena
 * (the real method returns undefined without calling the callback in that case).
 */
export function stubBackgroundViewCtxForComponent(
  studioCtx: StudioCtx,
  envProvider: (
    component: Component,
    tpl: TplNode
  ) => Record<string, unknown> | undefined,
  opts?: { noViewCtx?: boolean }
) {
  studioCtx.withBackgroundViewCtxForComponent = (async (
    component: Component,
    cb: (viewCtx: ViewCtx) => Promise<unknown>
  ) => {
    if (opts?.noViewCtx) {
      return undefined;
    }
    const fakeViewCtx = {
      getCanvasEnvForTpl: (tpl: TplNode) => envProvider(component, tpl),
      isStale: () => false,
      awaitSync: async () => undefined,
    } as unknown as ViewCtx;
    return cb(fakeViewCtx);
  }) as StudioCtx["withBackgroundViewCtxForComponent"];
}
