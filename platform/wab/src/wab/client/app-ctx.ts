import { Api, setUser } from "@/wab/client/api";
import { isHostFrame, Router, UU } from "@/wab/client/cli-routes";
import { getClientDevFlagOverrides } from "@/wab/client/client-dev-flags";
import { maybeShowPaywall } from "@/wab/client/components/modals/PricingModal";
import { StarterGroupProps } from "@/wab/client/components/StarterGroup";
import { App } from "@/wab/client/components/top-view";
import { TopFrameApi } from "@/wab/client/frame-ctx/top-frame-api";
import { PromisifyMethods } from "@/wab/commons/promisify-methods";
import {
  ApiPermission,
  ApiTeam,
  ApiUser,
  ApiWorkspace,
  AppCtxResponse,
  PersonalApiToken,
} from "@/wab/shared/ApiSchema";
import { FastBundler } from "@/wab/shared/bundler";
import { parseBundle } from "@/wab/shared/bundles";
import { ensure, swallowAsync } from "@/wab/shared/common";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import {
  applyDevFlagOverrides,
  applyDevFlagOverridesToTarget,
  applyPlasmicUserDevFlagOverrides,
  DEVFLAGS,
  DevFlagsType,
} from "@/wab/shared/devflags";
import { notification } from "antd";
import { History } from "history";
import $ from "jquery";
import L from "lodash";
import { observable } from "mobx";
import * as React from "react";
import { useContext } from "react";

export class NonAuthCtx {
  /** PromisifyMethods so that `api` behaves the same in both the top frame and host frame. */
  api: PromisifyMethods<Api>;
  /** This is only set when in the host frame. */
  topFrameApi: PromisifyMethods<TopFrameApi> | null;
  app?: App;
  history: History;
  router: Router;
  change: (f: () => void) => void;
  bundler: FastBundler;
  readonly lastBundleVersion: string;

  constructor(args: NonAuthCtx) {
    Object.assign(
      this,
      L.pick(
        args,
        "api",
        "topFrameApi",
        "app",
        "history",
        "router",
        "change",
        "bundler",
        "lastBundleVersion"
      )
    );
  }
}

export const NonAuthCtxContext = React.createContext<NonAuthCtx | undefined>(
  undefined
);

export const useNonAuthCtx = () =>
  ensure(useContext(NonAuthCtxContext), "No NonAuthCtxContext provided");

export interface NonAuthComponentProps {
  nonAuthCtx: NonAuthCtx;
}

export abstract class NonAuthComponentBase<
  P = {},
  S = {}
> extends React.Component<P, S> {
  abstract nonAuthCtx(): NonAuthCtx;
  api() {
    return this.nonAuthCtx().api;
  }
  app() {
    return this.nonAuthCtx().app;
  }
  router() {
    return this.nonAuthCtx().router;
  }
  change(f) {
    return this.nonAuthCtx().change(f);
  }
  routeTo(u) {
    return this.router().routeTo(u);
  }
  bundler() {
    return this.nonAuthCtx().bundler;
  }
}

export class NonAuthComponent<
  P extends NonAuthComponentProps = NonAuthComponentProps,
  S = {}
> extends NonAuthComponentBase<P, S> {
  nonAuthCtx() {
    return this.props.nonAuthCtx;
  }
}

interface SelfInfo extends ApiUser {
  usesOauth?: boolean;
  isObserver?: boolean;
}

export function isWhiteLabelUser(user: SelfInfo) {
  return !!user.isWhiteLabel;
}

interface AppCtxArgs {
  api: PromisifyMethods<Api>;
  topFrameApi: PromisifyMethods<TopFrameApi> | null;
  app: App;
  history: History;
  router: Router;
  change: (f: () => void) => void;
  bundler: FastBundler;
  selfInfo: SelfInfo | null;
  teams: ApiTeam[];
  workspaces: ApiWorkspace[];
  perms: ApiPermission[];
  starters: Starters;
  reloadAll: () => Promise<void>;
  reloadAppCtx: () => Promise<void>;
  ops: AppOps | null;
  appConfig: typeof DEVFLAGS;
  readonly lastBundleVersion: string;
}

export class AppCtx {
  api: PromisifyMethods<Api>;
  topFrameApi: TopFrameApi | null;
  app: App;
  history: History;
  router: Router;
  change: (f: () => void) => void;
  bundler: FastBundler;
  selfInfo: SelfInfo | null;
  teams: ApiTeam[];
  workspaces: ApiWorkspace[];
  perms: ApiPermission[];
  starters: Starters;
  reloadAll: () => Promise<void>;
  reloadAppCtx: () => Promise<void>;
  ops: AppOps | null;
  /** Final app config with overrides applied already. */
  appConfig: typeof DEVFLAGS;
  /** App config overrides only. */
  appConfigOverrides: Partial<typeof DEVFLAGS>;

  readonly lastBundleVersion: string;

  private _personalApiTokens = observable.box<PersonalApiToken[] | null>(null);
  get personalApiTokens() {
    return this._personalApiTokens.get();
  }
  set personalApiTokens(tokens: PersonalApiToken[] | null) {
    this._personalApiTokens.set(tokens);
  }

  constructor(args: AppCtxArgs) {
    Object.assign(this, args);
  }

  getAllTeams() {
    return L.sortBy(
      L.uniqBy(
        [...this.teams, ...this.workspaces.map((w) => w.team)],
        (t) => t.id
      ),
      (t) => t.name
    ).filter((it) => !it.personalTeamOwnerId);
  }

  get personalTeam() {
    return this.teams.find((it) => it.personalTeamOwnerId);
  }

  get personalWorkspace() {
    return this.workspaces.find((it) => it.team.personalTeamOwnerId);
  }

  async logout() {
    if (this.selfInfo && !this.selfInfo.isFake) {
      await this.api.logout();
    }
    this.selfInfo = null;
    // Explicitly setting window.location.href, instead of
    // using router, to make sure we completely clear in-page
    // js state
    window.location.href = UU.login.fill({});
  }

  isWhiteLabelUser() {
    return this.selfInfo && isWhiteLabelUser(this.selfInfo);
  }
}

interface AppComponentProps {
  appCtx: AppCtx;
  children?: React.ReactNode;
}

export class AppComponent<
  P extends AppComponentProps = AppComponentProps,
  S = {}
> extends React.Component<P, S> {
  appCtx() {
    return this.props.appCtx;
  }
  api() {
    return this.appCtx().api;
  }
  app() {
    return this.appCtx().app;
  }
  bundler() {
    return this.appCtx().bundler;
  }
  router() {
    return this.appCtx().router;
  }
  change(f) {
    return this.appCtx().change(f);
  }
  routeTo(u) {
    return this.router().routeTo(u);
  }
  async logout() {
    await this.appCtx().logout();
  }
  selfInfo() {
    return this.appCtx().selfInfo;
  }
  reloadAll() {
    return this.appCtx().reloadAll();
  }
  ops() {
    return ensure(this.appCtx().ops, "appCtx has no ops");
  }
}

export class AppOps extends AppComponent {
  async renameSite(siteId: string, name: string) {
    await maybeShowPaywall(
      this.appCtx(),
      async () => await this.api().setSiteInfo(siteId, { name })
    );
    await this.reloadAll();
  }
  async deleteSite(siteId: string) {
    await this.api().deleteSite(siteId);
    await this.reloadAll();
    notification.info({ message: "Project deleted" });
  }
  async createPersonalApiToken() {
    const token = await this.api().createPersonalApiToken();
    this.appCtx().personalApiTokens = null;
    return token;
  }
  async revokePersonalApiToken(token: string) {
    await this.api().revokePersonalApiToken(token);
    this.appCtx().personalApiTokens = null;
    return token;
  }
  async emitPersonalApiToken(initToken: string) {
    const token = await this.api().emitPersonalApiToken(initToken);
    this.appCtx().personalApiTokens = null;
    return token;
  }
  private lastDownloadUrl: string | null = null;
  async download(projectId: string, opts?: { dontMigrateProject?: boolean }) {
    const { project, rev, depPkgs } = await this.api().getSiteInfo(projectId, {
      revisionNum: DEVFLAGS.revisionNum ? DEVFLAGS.revisionNum : undefined,
      dontMigrateProject: !!opts?.dontMigrateProject,
    });

    const $link = $(".hidden-file-download");
    const blob = new Blob(
      [
        JSON.stringify([
          ...depPkgs.map((info) => {
            return [info.id, info.model];
          }),
          // Not using `getBundle` as it would throw an error if the project
          // is not migrated
          [project.id, parseBundle(rev)],
        ]),
      ],
      {
        type: "text/plain;charset=utf-8",
      }
    );

    if (this.lastDownloadUrl) {
      // Note that the URL created by URL.createObjectURL(blob) won't be
      // released until the document is unloaded or the URL is explicitly
      // released. So here we release it explicitly.
      URL.revokeObjectURL(this.lastDownloadUrl);
    }
    // Data URL has a size limit. However, object url doesn't.
    this.lastDownloadUrl = URL.createObjectURL(blob);
    $link.attr("href", this.lastDownloadUrl);
    $link.attr("download", `${L.kebabCase(project.name)}_${rev.revision}.json`);
    $link[0].click();
  }

  async downloadFullProjectData(projectId: string, branchIds: string[]) {
    const data = await this.api().getFullProjectData(projectId, branchIds);

    const $link = $(".hidden-file-download");
    const blob = new Blob([JSON.stringify(data)], {
      type: "text/plain;charset=utf-8",
    });

    if (this.lastDownloadUrl) {
      // Note that the URL created by URL.createObjectURL(blob) won't be
      // released until the document is unloaded or the URL is explicitly
      // released. So here we release it explicitly.
      URL.revokeObjectURL(this.lastDownloadUrl);
    }
    // Data URL has a size limit. However, object url doesn't.
    this.lastDownloadUrl = URL.createObjectURL(blob);
    $link.attr("href", this.lastDownloadUrl);
    $link.attr(
      "download",
      `${L.kebabCase(data.project.name)}_${new Date().toISOString()}.json`
    );
    $link[0].click();
  }
}

// Constant used to determine what starter sections are shown
//   e.g. https://studio.plasmic.app/?starters=general,sitebuilder
const DEFAULT_STARTER_TAG = "general";
const DEFAULT_APP_TAG = "app";

interface Starters {
  templateAndExampleSections: StarterGroupProps[];
  tutorialSections: StarterGroupProps[];
  appSections: StarterGroupProps[];
}

export function loadStarters(
  api: PromisifyMethods<Api>,
  user: ApiUser | null,
  appConfig: DevFlagsType
): Starters {
  if (isHostFrame() || !user) {
    return {
      tutorialSections: [],
      templateAndExampleSections: [],
      appSections: [],
    };
  }

  const showAdminTeamOnlySections = isAdminTeamEmail(user.email, appConfig);

  const filteredSections = appConfig.starterSections.filter(
    (s) =>
      s.tag === DEFAULT_STARTER_TAG &&
      (!s.isPlasmicOnly || showAdminTeamOnlySections)
  );

  const tutorialSections = filteredSections.slice(0, 1) ?? [];
  const blankProjectSection: StarterGroupProps = {
    title: "Blank",
    // An undefined project will be interpreted as a blank project.  This is only
    // used for dev servers; in production, we always create blank projects from
    // a template as well.
    projects: [
      {
        name: "Blank project",
        tag: "",
        description: "",
      },
    ],
    tag: "",
  };

  const templateAndExampleSections = [
    ...(appConfig.hideBlankStarter ? [] : [blankProjectSection]),
    ...(filteredSections.slice(1) ?? []),
  ];

  const appSections = appConfig.starterSections.filter(
    (s) => s.tag === DEFAULT_APP_TAG
  );

  return {
    tutorialSections,
    templateAndExampleSections,
    appSections,
  };
}

export async function withHostFrameCache<T>(
  key: string,
  useCaching: boolean,
  baseApi: PromisifyMethods<Api>,
  f: () => Promise<T>
): Promise<T> {
  const realKey = `plasmic.load-cache.${key}`;
  if (isHostFrame()) {
    if (useCaching) {
      const cached = await baseApi.getStorageItem(realKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
  }
  const result = await f();
  if (result) {
    await baseApi.addStorageItem(realKey, JSON.stringify(result));
  } else {
    await baseApi.removeStorageItem(realKey);
  }
  return result;
}

export async function loadAppCtx(
  nonAuthCtx: NonAuthCtx,
  useCaching: boolean = false
) {
  const baseApi = nonAuthCtx.api;

  async function getAppCtx(): Promise<AppCtxResponse> {
    if (isHostFrame()) {
      return { workspaces: [], teams: [], perms: [] };
    }

    return baseApi.getAppCtx();
  }

  async function load() {
    const [
      selfInfo,
      { config: dbConfigOverrides },
      { teams, workspaces, perms },
    ] = await Promise.all([
      withHostFrameCache("selfInfo", useCaching, baseApi, () =>
        swallowAsync(baseApi.getSelfInfo())
      ),
      withHostFrameCache("appConfig", useCaching, baseApi, () =>
        baseApi.getAppConfig()
      ),
      getAppCtx(),
    ]);

    const user = selfInfo?.user || null;
    const usesOauth = selfInfo?.usesOauth || false;
    if (isHostFrame() && user) {
      setUser(user);
    }

    const appConfigOverrides = dbConfigOverrides;

    // First apply default Plasmic overrides
    if (
      isAdminTeamEmail(user?.email, dbConfigOverrides) &&
      !user?.adminModeDisabled
    ) {
      applyPlasmicUserDevFlagOverrides(appConfigOverrides);
    }

    // Next apply client-specified overrides, via url params and
    // localStorage
    const clientConfigOverrides = getClientDevFlagOverrides();
    applyDevFlagOverridesToTarget(appConfigOverrides, clientConfigOverrides);

    // Apply to DEVFLAGS
    applyDevFlagOverrides(appConfigOverrides);

    const starters = loadStarters(baseApi, user, dbConfigOverrides);

    return {
      selfInfo: user
        ? { ...user, usesOauth, isObserver: selfInfo?.observer }
        : null,
      appConfig: DEVFLAGS,
      appConfigOverrides,
      starters,
      teams,
      workspaces,
      perms,
    };
  }

  async function reloadAll() {
    Object.assign(appCtx, await load());
    return nonAuthCtx.change(() => {});
  }

  async function reloadAppCtx() {
    Object.assign(appCtx, await getAppCtx());
    return nonAuthCtx.change(() => {});
  }

  const loaded = await load();

  const appCtx = new AppCtx({
    api: baseApi,
    topFrameApi: nonAuthCtx.topFrameApi,
    app: ensure(nonAuthCtx.app, "nonAuthCtx has no app"),
    bundler: nonAuthCtx.bundler,
    change: nonAuthCtx.change,
    history: nonAuthCtx.history,
    router: nonAuthCtx.router,
    ...loaded,
    reloadAll,
    reloadAppCtx,
    ops: null,
    lastBundleVersion: nonAuthCtx.lastBundleVersion,
  });
  appCtx.ops = new AppOps({ appCtx });
  return appCtx;
}

export function hideHelp(appCtx: AppCtx) {
  const { appConfig } = appCtx;
  return appConfig.hideHelpForUsers.some(
    (pattern) =>
      appCtx.selfInfo && appCtx.selfInfo.email.match(new RegExp(pattern))
  );
}

export function hideStarters(appCtx: AppCtx) {
  const { appConfig } = appCtx;
  return appConfig.hideStartersForUsers.some(
    (pattern) =>
      appCtx.selfInfo && appCtx.selfInfo.email.match(new RegExp(pattern))
  );
}
