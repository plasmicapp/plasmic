import { BundlingSiteApi } from "@/wab/client/api";
import { AppCtx } from "@/wab/client/app-ctx";
import { App } from "@/wab/client/components/top-view";
import type { ProjectRevision } from "@/wab/server/entities/Entities";
import { ApiBranch } from "@/wab/shared/ApiSchema";
import { isPkgVersionInfoMeta, isProjectRevision } from "@/wab/shared/EntUtil";
import { PkgVersionInfoMeta, SiteInfo } from "@/wab/shared/SharedApi";
import { TplMgr } from "@/wab/shared/TplMgr";
import { maybe } from "@/wab/shared/common";
import {
  ChangeRecorder,
  FakeChangeRecorder,
  IChangeRecorder,
} from "@/wab/shared/core/observable-model";
import { trackComponentRoot, trackComponentSite } from "@/wab/shared/core/tpls";
import { Site } from "@/wab/shared/model/classes";
import { IObservableValue, observable } from "mobx";

class DbCtxArgs {
  app: App;
  api: BundlingSiteApi;
  modelVersion: number;
  hostlessDataVersion: number;
  siteInfo: SiteInfo;
  site: Site;
  appCtx: AppCtx;
  revisionNum: number;
  branch?: ApiBranch;
}

// for use in views
export class DbCtx {
  private readonly _tplMgr = new TplMgr(this);
  private _recorder: IChangeRecorder;
  private _siteInfo: IObservableValue<SiteInfo>;
  private _revisionNum: IObservableValue<number>;

  // site, branchInfo, and pkgVersionInfoMeta should be set atomically in setSite only
  private _site: IObservableValue<Site>;
  /** Branch, or undefined for main branch. */
  private _branchInfo: IObservableValue<ApiBranch | undefined> =
    observable.box(undefined);
  /** Project Revision, Pkg version or undefined for latest revision. */
  private _projectVersionInfo: IObservableValue<
    ProjectRevision | PkgVersionInfoMeta | undefined
  > = observable.box(undefined);

  constructor(private readonly args: DbCtxArgs) {
    this._siteInfo = observable.box(args.siteInfo);
    this._revisionNum = observable.box(args.revisionNum);
    this._recorder = args.appCtx.appConfig.noObserve
      ? new FakeChangeRecorder()
      : this.createRecorder(args.site);
    this._site = observable.box(args.site);
    this._branchInfo.set(args.branch);
    for (const component of args.site.components) {
      trackComponentRoot(component);
      trackComponentSite(component, args.site);
    }
  }

  tplMgr() {
    return this._tplMgr;
  }

  get app() {
    return this.args.app;
  }
  get api() {
    return this.args.api;
  }
  get siteInfo() {
    return this._siteInfo.get();
  }
  get branchInfo() {
    return this._branchInfo.get();
  }

  get projectVersionInfo() {
    return this._projectVersionInfo.get();
  }

  get revisionInfo(): ProjectRevision | undefined {
    const info = this._projectVersionInfo.get();
    return info && isProjectRevision(info) ? info : undefined;
  }

  get pkgVersionInfoMeta(): PkgVersionInfoMeta | undefined {
    const info = this._projectVersionInfo.get();
    return info && isPkgVersionInfoMeta(info) ? info : undefined;
  }

  get modelVersion() {
    return this.args.modelVersion;
  }
  get hostlessDataVersion() {
    return this.args.hostlessDataVersion;
  }
  get site() {
    return this._site.get();
  }
  get appCtx() {
    return this.args.appCtx;
  }
  get revisionNum() {
    return this._revisionNum.get();
  }
  set revisionNum(v: number) {
    this._revisionNum.set(v);
  }
  get recorder() {
    return this._recorder;
  }
  bundler() {
    return this.appCtx.bundler;
  }
  setSite(
    site: Site,
    branch: ApiBranch | undefined,
    projectVersion: PkgVersionInfoMeta | ProjectRevision | undefined,
  ) {
    this._site.set(site);
    this._branchInfo.set(branch);
    this._projectVersionInfo.set(projectVersion);

    if (this._recorder) {
      this._recorder.dispose();
    }
    this._recorder = this.createRecorder(site);

    for (const component of site.components) {
      trackComponentRoot(component);
      trackComponentSite(component, site);
    }
  }

  dispose() {
    if (this._recorder) {
      this._recorder.dispose();
    }
  }

  setSiteInfo(siteInfo: SiteInfo) {
    this._siteInfo.set(siteInfo);
  }

  private createRecorder(site: Site) {
    return new ChangeRecorder({
      site,
      isExternalRef: (obj) =>
        !!maybe(
          this.bundler().addrOf(obj),
          (addr) => addr.uuid !== this.siteInfo.id,
        ),
    });
  }
}

export abstract class WithDbCtx {
  abstract dbCtx(): DbCtx;

  get recorder() {
    return this.dbCtx().recorder;
  }

  get site() {
    return this.dbCtx().site;
  }

  get siteInfo() {
    return this.dbCtx().siteInfo;
  }

  get api() {
    return this.dbCtx().api;
  }

  get app() {
    return this.dbCtx().app;
  }

  get revisionNum() {
    return this.dbCtx().revisionNum;
  }

  get appCtx() {
    return this.dbCtx().appCtx;
  }

  bundler() {
    return this.dbCtx().bundler();
  }

  tplMgr() {
    return this.dbCtx().tplMgr();
  }
}
