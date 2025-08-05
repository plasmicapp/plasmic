import { AppCtx } from "@/wab/client/app-ctx";
import {
  DefaultUpsellCheckoutProps,
  PlasmicUpsellCheckout,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicUpsellCheckout";
import { ApiFeatureTier, BillingFrequency } from "@/wab/shared/ApiSchema";
import { newFeatureTiers } from "@/wab/shared/pricing/pricing-utils";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
} from "@stripe/react-stripe-js";
import { Spin } from "antd";
import * as React from "react";

interface UpsellCheckoutProps extends DefaultUpsellCheckoutProps {
  appCtx: AppCtx;
  disabled: boolean;
  hasActiveSubscription: boolean;
  teamName: string;
  currentTier: ApiFeatureTier | null;
  tier: ApiFeatureTier;
  seats: number;
  onSetSeats: (s: number) => void;
  billingFreq: BillingFrequency;
  onSetBillingFreq: (freq: BillingFrequency) => void;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  onResetTier: () => void;
}

function UpsellCheckout_(
  props: UpsellCheckoutProps,
  ref: HTMLElementRefOf<"div">
) {
  const {
    appCtx,
    disabled,
    hasActiveSubscription,
    teamName,
    currentTier,
    tier,
    seats,
    onSetSeats,
    billingFreq,
    onSetBillingFreq,
    onSubmit,
    onCancel,
    onResetTier,
    ...rest
  } = props;

  const tiers: string[] = [...newFeatureTiers];
  const currentTierLevel = currentTier ? tiers.indexOf(currentTier.name) : -1;
  const newTierLevel = tiers.indexOf(tier.name);

  const operation = currentTierLevel <= newTierLevel ? "Upgrade" : "Downgrade";

  return (
    <PlasmicUpsellCheckout
      root={{ ref }}
      {...rest}
      teamName={teamName}
      operationTitle={operation}
      operationDescription={operation.toLowerCase()}
      billingFrequencyToggle={{
        // Don't let users switch billingFreq if they already have a subscription
        isDisabled: hasActiveSubscription,
        isChecked: billingFreq === "year",
        onChange: (checked) => {
          if (checked) {
            onSetBillingFreq("year");
          } else {
            onSetBillingFreq("month");
          }
        },
      }}
      bill={{
        tier,
        seats,
        setSeats: onSetSeats,
        billingFreq,
      }}
      priceTierPicker={{
        appCtx: appCtx,
        availableTiers: [tier],
        onSelectFeatureTier: async () => onResetTier(),
        billingFrequency: billingFreq,
        overrideStatus: "goback",
        hideEnterprise: true,
        hideFree: true,
      }}
      stripeCardElement={{
        render: () => <CardNumberElement />,
      }}
      stripeExpiryElement={{
        render: () => <CardExpiryElement />,
      }}
      stripeCvcElement={{
        render: () => <CardCvcElement />,
      }}
      // See Plasmic project. We have 2 of each, hidden depending on
      // whether skipCreditCard is enabled
      confirmButton={{
        disabled,
        onClick: onSubmit,
      }}
      confirmButton2={{
        disabled,
        onClick: onSubmit,
      }}
      cancelButton={{
        disabled,
        onClick: onCancel,
      }}
      cancelButton2={{
        disabled,
        onClick: onCancel,
      }}
      spinnerContainer={{
        children: disabled && <Spin />,
      }}
      spinnerContainer2={{
        children: disabled && <Spin />,
      }}
    />
  );
}

const UpsellCheckout = React.forwardRef(UpsellCheckout_);
export default UpsellCheckout;
