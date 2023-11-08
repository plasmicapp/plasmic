import React from "react";
import { spawn } from "../../../../common";
import { U } from "../../../cli-routes";
import {
  promptBilling,
  PromptBillingArgs,
  showUpsellConfirm,
} from "../../modals/PricingModal";

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
