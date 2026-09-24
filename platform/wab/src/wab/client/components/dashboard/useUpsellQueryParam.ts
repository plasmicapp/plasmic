import { AppCtx } from "@/wab/client/app-ctx";
import {
  canUpgradeTeam,
  PaywallError,
  promptBilling,
  showUpsellConfirm,
} from "@/wab/client/components/modals/PricingModal";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { useAsyncStrict } from "@/wab/client/hooks/useAsyncStrict";
import { useHistory, useLocation } from "@/wab/client/route/HistoryProvider";
import { ApiTeam } from "@/wab/shared/ApiSchema";
import { ORGANIZATION_LOWER } from "@/wab/shared/Labels";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { notification } from "antd";
import sortBy from "lodash/sortBy";

const UPSELL_QUERY_PARAM = "upsell";

/** Redirects `?upsell=<tierName>` to an upgradeable org settings page. */
export function shouldUpsellRedirect(
  appCtx: AppCtx,
  location: { pathname: string; search: string },
): string | undefined {
  const { pathname, search } = location;
  if (
    !new URLSearchParams(search).has(UPSELL_QUERY_PARAM) ||
    APP_ROUTES.orgSettings.parse(pathname, false)
  ) {
    return undefined;
  }

  const [team] = sortBy(
    appCtx.teams.filter((t) => canUpgradeTeam(appCtx, t)),
    (t) => new Date(t.createdAt).getTime(),
  );
  if (team) {
    return APP_ROUTES.orgSettings.fill({ teamId: team.id }, search);
  }

  return undefined;
}

/** Prompts upsell using `?upsell=<tierName>`, which comes from nwww pricing page. */
export function useUpsellQueryParam(team: ApiTeam) {
  const appCtx = useAppCtx();
  const history = useHistory();
  const search = useLocation().search;

  useAsyncStrict(async () => {
    const tierName = new URLSearchParams(search).get(UPSELL_QUERY_PARAM);
    if (!tierName) {
      return;
    }
    const featureTiers = await appCtx.api.listCurrentFeatureTiers();
    const tier = featureTiers.tiers.find(
      (t) => t.name.toLowerCase() === tierName.toLowerCase(),
    );
    if (!tier) {
      return;
    }
    if (!canUpgradeTeam(appCtx, team)) {
      notification.warning({
        message: `You don't have permission to upgrade this ${ORGANIZATION_LOWER}.`,
      });
      return;
    }
    const billing = await promptBilling({
      appCtx,
      title: "Upgrade your Plasmic plan",
      target: {
        team,
        initialTier: tier,
      },
      availableTiers: featureTiers.tiers,
    });

    if (!billing) {
      return;
    } else if (billing.type === "fail") {
      throw new PaywallError("billing", billing.errorMsg);
    }
    await showUpsellConfirm(APP_ROUTES.orgSettings.fill({ teamId: team.id }));
    // Drop the query param so re-renders don't prompt again.
    history.replace(APP_ROUTES.orgSettings.fill({ teamId: team.id }));
  }, [search, team.id]);
}
