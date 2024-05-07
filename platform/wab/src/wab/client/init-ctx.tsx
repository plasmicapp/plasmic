import { ProjectDependency } from "@/wab/classes";
import * as Api from "@/wab/client/api";
import { AppCtx, hideStarters } from "@/wab/client/app-ctx";
import {
  getEmaiLVerificationRouteWithContinuation,
  getLoginRouteWithContinuation,
  parseProjectLocation,
  UU,
} from "@/wab/client/cli-routes";
import { PublicLink } from "@/wab/client/components/PublicLink";
import * as DbMod from "@/wab/client/db";
import { asyncNever, spawn } from "@/wab/common";
import { getProjectFlags } from "@/wab/devflags";
import * as exprs from "@/wab/exprs";
import { ApiBranch, MainBranchId, ProjectId } from "@/wab/shared/ApiSchema";
import { getBundle } from "@/wab/shared/bundles";
import { instUtil } from "@/wab/shared/core/InstUtil";
import { SiteInfo } from "@/wab/shared/SharedApi";
import { $$$ } from "@/wab/shared/TplQuery";
import { fixPageHrefsToLocal } from "@/wab/shared/utils/split-site-utils";
import { unbundleSite } from "@/wab/tagged-unbundle";
import * as tpls from "@/wab/tpls";
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

  if (hideStarters(appCtx) && siteInfo.name.includes("Plasmic Levels")) {
    throw new Error("Could not read property '__bundleInfo' of undefined");
  }
  const bundle = getBundle(rev, appCtx.lastBundleVersion);
  const { site, depPkgs: depPkgVersions } = unbundleSite(
    bundler,
    siteInfo.id,
    bundle,
    depPkgs
  );
  appCtx.appConfig = getProjectFlags(site, appCtx.appConfig);
  spawn(checkDepPkgHosts(appCtx, siteInfo, depPkgVersions));

  (window as any).dbg.site = site;
  (window as any).dbg.instUtil = instUtil;
  (window as any).dbg.tpls = tpls;
  (window as any).dbg.$$$ = $$$;
  (window as any).dbg.splitSiteUtils = {
    fixPageHrefsToLocal,
  };
  (window as any).dbg.exprs = exprs;

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
            <PublicLink
              target="_blank"
              href={UU.project.fill({
                projectId: pkgVersion.pkg.pkg?.projectId,
              })}
            >
              {pkgVersion.pkg.pkg?.name}
            </PublicLink>
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
