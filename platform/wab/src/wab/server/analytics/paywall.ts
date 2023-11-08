import * as Sentry from "@sentry/node";
import { Request } from "express-serve-static-core";
import { ApiFeatureTier } from "../../shared/ApiSchema";
import { Team } from "../entities/Entities";
import { getTeamCurrentPeriodRange } from "../routes/team-plans";
import { getRendersInTimestampRange } from "./queries";

export async function isUnderMonthlyViewsLimit(
  featureTier: ApiFeatureTier,
  resource: {
    team?: Team;
    projectId?: string;
  },
  req: Request
) {
  const { team, projectId } = resource;
  try {
    const { start, end } = await getTeamCurrentPeriodRange(
      team,
      team?.trialDays ?? req.devflags.freeTrialDays
    );

    const renders = await getRendersInTimestampRange({
      start,
      end,
      teamId: team?.id,
      projectId: !team ? projectId : undefined, // Only set projectId if there is no team, since $render(teamId) > $render(projectId)
    });

    if (renders > featureTier.monthlyViews) {
      Sentry.captureException(
        new Error(
          `Team=${
            team?.id ?? "null"
          }/Project=${projectId} would be blocked by paywall (${renders} / ${
            featureTier.monthlyViews
          })`
        )
      );
      return {
        valid: !req.devflags.monthlyViewsPaywall,
        renders,
      };
    }
    return {
      valid: true,
      renders,
    };
  } catch (err) {
    Sentry.captureException(err);
    return {
      valid: true,
      renders: 0,
    };
  }
}
