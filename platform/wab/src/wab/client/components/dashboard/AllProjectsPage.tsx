import { U } from "@/wab/client/cli-routes";
import { documentTitle } from "@/wab/client/components/dashboard/page-utils";
import {
  PaywallError,
  promptBilling,
  showUpsellConfirm,
} from "@/wab/client/components/modals/PricingModal";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { useAsyncStrict } from "@/wab/client/hooks/useAsyncStrict";
import {
  DefaultAllProjectsPageProps,
  PlasmicAllProjectsPage,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicAllProjectsPage";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as querystring from "querystring";
import * as React from "react";
import { useHistory, useLocation } from "react-router-dom";

type AllProjectsPageProps = DefaultAllProjectsPageProps;

const upsellQuery = "upsell";

function AllProjectsPage_(
  props: AllProjectsPageProps,
  ref: HTMLElementRefOf<"div">
) {
  const appCtx = useAppCtx();
  const history = useHistory();
  const search = useLocation().search;
  const query = querystring.decode(
    search.startsWith("?") ? search.slice(1) : search
  );

  useAsyncStrict(async () => {
    const featureTiers = await appCtx.api.listCurrentFeatureTiers();
    const rawTierName = query[upsellQuery];
    const tierName =
      typeof rawTierName === "string" ? rawTierName.toLowerCase() : rawTierName;
    const tier = featureTiers.tiers.find(
      (t) => t.name.toLowerCase() === tierName
    );
    if (!tier) {
      return;
    }
    const billing = await promptBilling({
      appCtx,
      title: "Upgrade your Plasmic plan",
      target: {
        initialTier: tier,
      },
      availableTiers: featureTiers.tiers,
    });

    if (!billing) {
      return;
    } else if (billing.type === "fail") {
      throw new PaywallError("billing", billing.errorMsg);
    }
    // Success
    const team = billing.team;
    await showUpsellConfirm(U.orgSettings({ teamId: team.id }));
    history.push(U.org({ teamId: team.id }));
  }, [search]);

  return (
    <>
      {documentTitle("All projects")}
      <PlasmicAllProjectsPage
        root={{ ref }}
        {...props}
        projectList={{ workspaces: true }}
      />
    </>
  );
}

const AllProjectsPage = React.forwardRef(AllProjectsPage_);
export default AllProjectsPage;
