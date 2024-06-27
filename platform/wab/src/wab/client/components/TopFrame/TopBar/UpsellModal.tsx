import { U } from "@/wab/client/cli-routes";
import {
  promptBilling,
  PromptBillingArgs,
  showUpsellConfirm,
} from "@/wab/client/components/modals/PricingModal";
import { spawn } from "@/wab/shared/common";
import React from "react";

export const UpsellModal = (
  props: PromptBillingArgs & {
    setShowUpsellForm: (_: undefined) => void;
  }
) => {
  const showBillingModal = async () => {
    const response = await promptBilling(props);

    if (response?.type === "success") {
      await showUpsellConfirm(U.orgSettings({ teamId: response.team.id }));
    }

    props.setShowUpsellForm(undefined);
  };
  React.useEffect(() => {
    spawn(showBillingModal());
  }, []);
  return null;
};

export default UpsellModal;
