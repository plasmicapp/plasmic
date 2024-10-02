import { BundlingSiteApi } from "@/wab/client/api";
import { AppCtx } from "@/wab/client/app-ctx";
import { App } from "@/wab/client/components/top-view";
import { ApiBranch } from "@/wab/shared/ApiSchema";
import { PkgVersionInfoMeta, SiteInfo } from "@/wab/shared/SharedApi";
import { TplMgr } from "@/wab/shared/TplMgr";
import { maybe } from "@/wab/shared/common";
import {
  ChangeRecorder,
  ComponentContext,
  FakeChangeRecorder,
  IChangeRecorder,
} from "@/wab/shared/core/observable-model";
import { trackComponentRoot, trackComponentSite } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { instUtil } from "@/wab/shared/model/InstUtil";
import { Component, Site } from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";
import { uniqBy } from "lodash";
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
  /** Pkg version, or undefined for latest version. */
  private _pkgVersionInfoMeta: IObservableValue<
    PkgVersionInfoMeta | undefined
  > = observable.box(undefined);

  constructor(private readonly args: DbCtxArgs) {
    this._siteInfo = observable.box(args.siteInfo);
    this._revisionNum = observable.box(args.revisionNum);
    this._recorder = DEVFLAGS.noObserve
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
  get pkgVersionInfoMeta() {
    return this._pkgVersionInfoMeta.get();
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
    pkgVersionInfoMeta: PkgVersionInfoMeta | undefined
  ) {
    this._site.set(site);
    this._branchInfo.set(branch);
    this._pkgVersionInfoMeta.set(pkgVersionInfoMeta);

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

  /**
   * This function will observe the tplTree of any component that is still not being observed.
   * @param components the list of components to try to observe the tplTree of.
   * @returns true if any of the components in the list started being observed now, false otherwise.
   */
  maybeObserveComponents(
    components: Component[],
    componentContext?: ComponentContext
  ) {
    if (!this.appCtx.appConfig.incrementalObservables) {
      return false;
    }
    return this.recorder.maybeObserveComponents(
      uniqBy(components, "uuid"),
      componentContext
    );
  }

  private createRecorder(site: Site) {
    const incrementalObservables = this.appCtx.appConfig.incrementalObservables;
    return new ChangeRecorder(
      site,
      instUtil,
      [
        // Skip tracking parent pointers, which is a big source of cycles and
        // is just a redundant pointer anyway; if parent bas changed, something
        // else has also changed.
        // ---
        // Because of incremental saves, we do want to carefully track and apply
        // changes to the parent pointer. So we are including parent in tracking.
        // Performance seems comparable, but if things get worse, and we want
        // to exclude parent from tracking again, then we need to make sure
        // incremental saves does not break when we do so.
        // meta.getFieldByName("TplNode", "parent"),

        // Skip tracking ProjectDependency.site, which is static.  When a dep is
        // added to our site, we don't want to see them as detected new tpl nodes;
        // instead, ProjectDependencyManager will take care of updating the
        // styles, etc.
        meta.getFieldByName("ProjectDependency", "site"),
      ],
      [],
      (obj) =>
        !!maybe(
          this.bundler().addrOf(obj),
          (addr) => addr.uuid !== this.siteInfo.id
        ),
      undefined,
      incrementalObservables
        ? [meta.getFieldByName("Component", "tplTree")]
        : undefined,
      incrementalObservables
    );
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
