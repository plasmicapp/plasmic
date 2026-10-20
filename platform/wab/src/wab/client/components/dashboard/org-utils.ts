import { AppCtx } from "@/wab/client/app-ctx";
import { ApiTeam } from "@/wab/shared/ApiSchema";
import { getTierRank } from "@/wab/shared/pricing/pricing-utils";
import { sortBy } from "lodash";

export function getDefaultOrg(appCtx: AppCtx): ApiTeam | undefined {
  return sortBy(
    appCtx.getAllTeams(),
    (t) => -getTierRank(t.featureTier?.name),
    (t) => new Date(t.createdAt).getTime(),
  )[0];
}

export function getOrgInitials(name: string): string {
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/);

  return (
    (words.length >= 2
      ? words[0][0] + words[1][0]
      : trimmed.slice(0, 2)
    ).toUpperCase() || "?"
  );
}
