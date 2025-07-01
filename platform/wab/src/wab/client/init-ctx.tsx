import * as Api from "@/wab/client/api";
import { AppCtx } from "@/wab/client/app-ctx";
import {
  UU,
  getEmaiLVerificationRouteWithContinuation,
  getLoginRouteWithContinuation,
  parseProjectLocation,
} from "@/wab/client/cli-routes";
import * as DbMod from "@/wab/client/db";
import { ApiBranch, MainBranchId, ProjectId } from "@/wab/shared/ApiSchema";
import { SiteInfo } from "@/wab/shared/SharedApi";
import * as slotUtils from "@/wab/shared/SlotUtils";
import { $$$ } from "@/wab/shared/TplQuery";
import { getBundle } from "@/wab/shared/bundles";
import { findAllDataSourceOpExpr } from "@/wab/shared/cached-selectors";
import { asyncNever, spawn } from "@/wab/shared/common";
import * as exprs from "@/wab/shared/core/exprs";
import { unbundleSite } from "@/wab/shared/core/tagged-unbundle";
import * as tpls from "@/wab/shared/core/tpls";
import { getProjectFlags } from "@/wab/shared/devflags";
import { instUtil } from "@/wab/shared/model/InstUtil";
import { ProjectDependency } from "@/wab/shared/model/classes";
import { fixPageHrefsToLocal } from "@/wab/shared/utils/split-site-utils";
import { notification } from "antd";
import * as React from "react";

export async function loadSiteDbCtx(
  appCtx: AppCtx,
  onRefreshUi: () => void,
  siteId: string
) {
  const baseApi = appCtx.api;
  const { bundler } = appCtx;

  let branch: ApiBranch | undefined = undefined;
  const match = parseProjectLocation(appCtx.history.location);
  if (match) {
    if (match.branchName !== MainBranchId) {
      const branches = await appCtx.api.listBranchesForProject(
        siteId as ProjectId
      );
      branch = branches.branches.find((b) => b.name === match.branchName);
    }
  }

  const {
    project: siteInfo,
    perms,
    rev,
    depPkgs,
    modelVersion,
    hostlessDataVersion,
    owner,
    latestRevisionSynced,
    hasAppAuth,
    appAuthProvider,
    workspaceTutorialDbs,
    isMainBranchProtected,
  } = await (async () => {
    try {
      return await baseApi.getSiteInfo(siteId, { branchId: branch?.id });
    } catch (e) {
      if (!appCtx.selfInfo) {
        // User is not logged and project is not public.
        await appCtx.history.replace(getLoginRouteWithContinuation());
        return asyncNever();
      } else if (appCtx.selfInfo.waitingEmailVerification) {
        // User is not verified
        await appCtx.history.replace(
          getEmaiLVerificationRouteWithContinuation()
        );
        return asyncNever();
      }

      throw e;
    }
  })();
  siteInfo.perms = perms;
  siteInfo.owner = owner;
  siteInfo.latestRevisionSynced = latestRevisionSynced;
  siteInfo.hasAppAuth = hasAppAuth;
  siteInfo.appAuthProvider = appAuthProvider;
  siteInfo.workspaceTutorialDbs = workspaceTutorialDbs;
  siteInfo.isMainBranchProtected = isMainBranchProtected;

  const bundle = getBundle(rev, appCtx.lastBundleVersion);
  const { site, depPkgs: depPkgVersions } = unbundleSite(
    bundler,
    siteInfo.id,
    bundle,
    depPkgs
  );
  appCtx.appConfig = getProjectFlags(site, appCtx.appConfig);
  spawn(checkDepPkgHosts(appCtx, siteInfo, depPkgVersions));

  // Enable data queries after RSC release if any components already use them.
  // Occurs after applyPlasmicUserDevFlagOverrides, so skip if already enabled
  if (!appCtx.appConfig.enableDataQueries) {
    appCtx.appConfig.enableDataQueries =
      !appCtx.appConfig.rscRelease || !!findAllDataSourceOpExpr(site).length;
  }

  (window as any).dbg.site = site;
  (window as any).dbg.instUtil = instUtil;
  (window as any).dbg.tpls = tpls;
  (window as any).dbg.$$$ = $$$;
  (window as any).dbg.splitSiteUtils = {
    fixPageHrefsToLocal,
  };
  (window as any).dbg.exprs = exprs;
  (window as any).dbg.slotUtils = slotUtils;

  const rawSiteApi = new Api.SiteApi({ siteId, api: baseApi });
  const siteApi = new Api.BundlingSiteApi({ bundler, siteApi: rawSiteApi });
  appCtx.bundler = bundler;
  const dbCtx = new DbMod.DbCtx({
    app: appCtx.app,
    api: siteApi,
    siteInfo,
    modelVersion,
    hostlessDataVersion,
    site,
    appCtx,
    revisionNum: rev.revision,
    branch,
  });

  return dbCtx;
}

export async function checkDepPkgHosts(
  appCtx: AppCtx,
  siteInfo: SiteInfo,
  deps: ProjectDependency[]
) {
  const pkgMetas = await Promise.all(
    deps.map((dep) => appCtx.api.getPkgVersionMeta(dep.pkgId, dep.version))
  );
  for (const pkgVersion of pkgMetas) {
    if (
      pkgVersion.pkg.hostUrl &&
      ![siteInfo.hostUrl, appCtx.appConfig.defaultHostUrl].includes(
        pkgVersion.pkg.hostUrl
      )
    ) {
      notification.warn({
        message: "This project imports from a project hosted by another app",
        description: (
          <p>
            This project is hosted by {siteInfo.hostUrl ?? "Plasmic"}, but it
            imports components from{" "}
            <a
              target="_blank"
              href={UU.project.fill({
                projectId: pkgVersion.pkg.pkg?.projectId,
              })}
            >
              {pkgVersion.pkg.pkg?.name}
            </a>
            , which is hosted by {pkgVersion.pkg.hostUrl}. <br />
            Notice this can prevent the canvas from rendering components
            correctly.
          </p>
        ),
        duration: 0,
      });
    }
  }
}
