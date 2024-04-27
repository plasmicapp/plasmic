import { DEVFLAGS } from "@/wab/devflags";
import {
  getConversionRate,
  getConversions,
  getImpressions,
  getRecentlyTrackedProjectComponents,
  getRendersInTimestampRange,
  Period,
} from "@/wab/server/analytics/queries";
import { unbundleProjectFromData } from "@/wab/server/db/DbBundleLoader";
import { getTeamCurrentPeriodRange } from "@/wab/server/routes/team-plans";
import { userDbMgr } from "@/wab/server/routes/util";
import { TeamId } from "@/wab/shared/ApiSchema";
import { Bundler } from "@/wab/shared/bundler";
import { Request, Response } from "express-serve-static-core";

export async function getAnalyticsForTeam(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { teamId } = req.params;
  await mgr.checkTeamPerms(teamId as TeamId, "viewer", "view analytics");

  const { from, to, timezone, period } = req.query;

  const team = await mgr.getTeamById(teamId as TeamId);
  const currentTier = team.featureTier || req.devflags.freeTier;
  if (!currentTier.analytics && DEVFLAGS.analyticsPaywall) {
    res.json({
      type: "paywall",
      data: [],
    });
    return;
  }

  const teamAnalytics = await getImpressions({
    teamId,
    from: from as string,
    to: to as string,
    timezone: timezone as string,
    period: period as Period | undefined,
  });
  res.json({ type: "impressions", data: teamAnalytics });
}

export async function getAnalyticsForProject(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { teamId, projectId } = req.params;
  await mgr.checkTeamPerms(teamId as TeamId, "viewer", "view analytics");
  await mgr.checkProjectPerms(projectId, "viewer", "view analytics");

  const { componentId, from, to, timezone, splitId, period, type } = req.query;

  const team = await mgr.getTeamById(teamId as TeamId);
  const currentTier = team.featureTier || req.devflags.freeTier;
  if (!currentTier.analytics && DEVFLAGS.analyticsPaywall) {
    res.json({
      type: "paywall",
      data: [],
    });
    return;
  }

  const opts = {
    teamId,
    projectId,
    componentId: componentId as string | undefined,
    from: from as string,
    to: to as string,
    timezone: timezone as string,
    splitId: splitId as string | undefined,
    period: period as Period | undefined,
  };

  if (type === "impressions") {
    const impressions = await getImpressions(opts);
    res.json({
      type,
      data: impressions,
    });
    return;
  }

  if (type === "conversions") {
    const conversions = await getConversions(opts);
    res.json({
      type,
      data: conversions,
    });
    return;
  }

  if (type === "conversion_rate") {
    const conversion_rate = await getConversionRate(opts);
    res.json({
      type,
      data: conversion_rate,
    });
    return;
  }

  throw new Error("unexpected analytics type");
}

export async function getAnalyticsProjectMeta(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const { projectId } = req.params;
  await mgr.checkProjectPerms(projectId, "viewer", "view project");

  const projectRev = await mgr.getLatestProjectRev(projectId);
  const bundler = new Bundler();
  const site = await unbundleProjectFromData(mgr, bundler, projectRev);
  const recentlyTrackedComponents = new Set(
    await getRecentlyTrackedProjectComponents(projectId)
  );

  const pages = site.components
    .filter((c) => recentlyTrackedComponents.has(c.uuid))
    .map((c) => ({
      id: c.uuid,
      name: c.name,
    }));
  const splits = site.splits.map((split) => ({
    id: split.uuid,
    name: split.name,
    type: split.splitType,
    slices: split.slices.map((slice, idx) => ({
      id: slice.uuid,
      name: idx === 0 ? "Original" : "Override",
    })),
  }));

  res.json({
    pages,
    splits,
  });
}

export async function getAnalyticsBillingInfoForTeam(
  req: Request,
  res: Response
) {
  const mgr = userDbMgr(req);
  const { teamId } = req.params;
  await mgr.checkTeamPerms(
    teamId as TeamId,
    "viewer",
    "view analytics billing"
  );
  const team = await mgr.getTeamById(teamId as TeamId);
  const currentTier = team.featureTier || req.devflags.freeTier;
  const { start, end } = await getTeamCurrentPeriodRange(
    team,
    team.trialDays ?? req.devflags.freeTrialDays
  );
  const renders = await getRendersInTimestampRange({
    start,
    end,
    teamId: team.id,
  });

  res.json({
    renders,
    limit: currentTier.monthlyViews,
    start,
    end,
  });
}
