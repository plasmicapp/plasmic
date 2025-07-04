import {
  promptBilling,
  PromptBillingArgs,
  showUpsellConfirm,
} from "@/wab/client/components/modals/PricingModal";
import { spawn } from "@/wab/shared/common";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import React from "react";

export const UpsellModal = (
  props: PromptBillingArgs & {
    setShowUpsellForm: (_: undefined) => void;
  }
) => {
  const showBillingModal = async () => {
    const response = await promptBilling(props);

    if (response?.type === "success") {
      await showUpsellConfirm(
        fillRoute(APP_ROUTES.orgSettings, { teamId: response.team.id })
      );
    }

    props.setShowUpsellForm(undefined);
  };
  React.useEffect(() => {
    spawn(showBillingModal());
  }, []);
  return null;
};

export default UpsellModal;
