import { ResponsiveStrategy } from "../../shared/responsiveness";
import {
  getOrderedScreenVariantSpecs,
  isScreenVariantGroup,
} from "../../shared/Variants";
import { allGlobalVariantGroups, getResponsiveStrategy } from "../../sites";
import { useStudioCtx } from "../studio-ctx/StudioCtx";

export function useResponsiveBreakpoints() {
  const studioCtx = useStudioCtx();
  const site = studioCtx.site;

  const strategy = getResponsiveStrategy(studioCtx.site);
  const isMobileFirst = strategy === ResponsiveStrategy.mobileFirst;
  const isUnknownStrategy = strategy === ResponsiveStrategy.unknown;

  const allScreenVariantGroups = allGlobalVariantGroups(site, {
    includeDeps: "direct",
    excludeEmpty: true,
    excludeHostLessPackages: true,
  }).filter(isScreenVariantGroup);

  const activeScreenGroup = studioCtx.site.activeScreenVariantGroup;
  const isActiveOwnedBySite =
    !!activeScreenGroup && site.globalVariantGroups.includes(activeScreenGroup);

  const orderedScreenVariants = activeScreenGroup
    ? getOrderedScreenVariantSpecs(studioCtx.site, activeScreenGroup)
    : [];

  return {
    strategy,
    isMobileFirst,
    isUnknownStrategy,
    allScreenVariantGroups,
    isActiveOwnedBySite,
    orderedScreenVariants,
  };
}
