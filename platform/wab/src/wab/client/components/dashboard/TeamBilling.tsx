import { AppCtx } from "@/wab/client/app-ctx";
import { U } from "@/wab/client/cli-routes";
import {
  promptBilling,
  showUpsellConfirm,
} from "@/wab/client/components/modals/PricingModal";
import { promptUpdateCc } from "@/wab/client/components/modals/UpdateCreditCardModal";
import {
  reactConfirm,
  reactHardConfirm,
  reactPrompt,
} from "@/wab/client/components/quick-modals";
import {
  DefaultTeamBillingProps,
  PlasmicTeamBilling,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicTeamBilling";
import {
  ApiFeatureTier,
  ApiTeam,
  BillingFrequency,
  TeamMember,
} from "@/wab/shared/ApiSchema";
import {
  calculateBill,
  getSubscriptionStatus,
} from "@/wab/shared/billing/billing-util";
import { ensure } from "@/wab/shared/common";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { ORGANIZATION_CAP } from "@/wab/shared/Labels";
import { isUpgradableTier } from "@/wab/shared/pricing/pricing-utils";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { notification } from "antd";
import * as React from "react";
import Stripe from "stripe";

interface TeamBillingProps extends DefaultTeamBillingProps {
  appCtx: AppCtx;
  team?: ApiTeam;
  members: TeamMember[];
  availFeatureTiers: ApiFeatureTier[];
  subscription?: Stripe.Subscription;
  onChange: () => Promise<void>;
  disabled?: boolean;
}

function TeamBilling_(props: TeamBillingProps, ref: HTMLElementRefOf<"div">) {
  const {
    appCtx,
    team,
    members,
    availFeatureTiers,
    subscription,
    onChange,
    disabled,
    ...rest
  } = props;
  const [billingEmail, setBillingEmail] = React.useState(team?.billingEmail);
  const [billingFreq, setBillingFreq] = React.useState<BillingFrequency>(
    team?.billingFrequency ?? "year"
  );

  // Figure out the current plan we're on
  const subStatus = team
    ? getSubscriptionStatus(team, availFeatureTiers, subscription)
    : undefined;

  const billingError =
    subStatus?.type === "invalid" ? subStatus.errorMsg : undefined;

  const currentBill = React.useMemo(() => {
    if (!team?.featureTier || !team?.seats || !team?.billingFrequency) {
      return null;
    }

    const bill = calculateBill(
      team.featureTier,
      team.seats,
      team.billingFrequency
    );
    return team.billingFrequency === "year"
      ? `$${bill.total}/year`
      : `$${bill.total}/month`;
  }, [team?.featureTier, team?.seats, team?.billingFrequency]);

  const seatsUsed = members.filter(
    (m) => !isAdminTeamEmail(m.email, DEVFLAGS)
  ).length;

  const upsell = async (tier: ApiFeatureTier, title?: string) => {
    if (!team) {
      return;
    }

    const { tiers } = await appCtx.api.listCurrentFeatureTiers();

    // Load the upsell modal to handle either an upgrade/downgrade or new subscription
    const promptResult = await promptBilling({
      appCtx,
      title: title ?? `Switch to ${tier.name}`,
      target: {
        team,
        initialTier: tier,
        initialBillingFreq: billingFreq,
      },
      availableTiers: tiers,
      // This means we already have an active paid subscription
      // hideCC: subStatus?.type === "valid" && !subStatus?.free,
    });

    if (!promptResult) {
      // User canceled
      return;
    } else if (promptResult.type === "fail") {
      // Show errors
      notification.warn({
        message: `Issue with payment, please try again.`,
        description: promptResult.errorMsg,
      });
    } else if (promptResult.type === "success") {
      await showUpsellConfirm(U.orgSettings({ teamId: team.id }));
    }

    // Refresh the latest team data
    await onChange();
  };

  const updateCreditCard = async () => {
    if (!team) {
      return;
    }

    // Load the upsell modal to handle either an upgrade/downgrade or new subscription
    const promptResult = await promptUpdateCc({
      appCtx,
      title: `Update payment method`,
      team,
    });

    if (!promptResult) {
      // User canceled
      return;
    } else if (promptResult.type === "fail") {
      // Show errors
      notification.warn({
        message: `Issue with updating payment method, please try again.`,
        description: promptResult.errorMsg,
      });
    } else if (promptResult.type === "success") {
      // TODO: custom confirm, currently using same as for upsell
      await showUpsellConfirm(U.orgSettings({ teamId: team.id }));
    }

    // Refresh the latest team data
    await onChange();
  };

  const startFreeTrial = async () => {
    if (!team) {
      return;
    }
    await appCtx.api.startFreeTrial(team?.id);
    await onChange();
  };

  return (
    <PlasmicTeamBilling
      root={{ ref }}
      {...rest}
      showBillingError={!!billingError}
      billingError={billingError}
      billingFrequencyToggle={{
        // Don't let users switch billingFreq if they already have a subscription
        isDisabled: !(subStatus?.type === "valid" && subStatus.free),
        isChecked: billingFreq === "year",
        onChange: (checked) => {
          if (checked) {
            setBillingFreq("year");
          } else {
            setBillingFreq("month");
          }
        },
      }}
      priceTierPicker={{
        appCtx: appCtx,
        disabled: disabled || !!billingError,
        billingFrequency: billingFreq,
        availableTiers: availFeatureTiers,
        currentFeatureTier:
          subStatus?.type === "valid" ? subStatus.tier : subStatus?.freeTier,
        canStartFreeTrial: !team?.trialStartDate,
        onSelectFeatureTier: upsell,
        onStartFreeTrial: startFreeTrial,
        isFreeTrialTeam: team?.onTrial,
      }}
      freeTrial={{
        team,
      }}
      // If we are on free or enterprise tiers, hide certain sections.
      tier={
        subStatus?.type === "valid" && (subStatus.free || team?.onTrial)
          ? "free"
          : subStatus?.type === "valid" &&
            subStatus.tier.name.includes("Enterprise")
          ? "enterprise"
          : undefined
      }
      currentBill={currentBill}
      seatsUsed={`${seatsUsed}`}
      seatsPurchased={`${team?.seats ?? appCtx.appConfig.freeTier.maxUsers}`}
      changeSeatsButton={{
        onClick: async () => {
          // Skip straight to the Checkout where you change the number of seats
          const tier = ensure(
            team?.featureTier,
            "Feature tier should exist to change seats"
          );
          await upsell(tier, "Change seat count");
        },
        disabled: disabled,
      }}
      changeCreditCardButton={{
        onClick: async () => {
          await updateCreditCard();
        },
      }}
      cancelSubscriptionButton={{
        onClick: async () => {
          // If the user is on not on a Upgradable tier,
          // ask they talk to us first before cancelling
          if (team && team.featureTier && !isUpgradableTier(team.featureTier)) {
            const confirmed = await reactConfirm({
              title: "Cancel your Plasmic plan",
              message:
                "We'd love to speak to you about your experience with Plasmic and walk you through the cancellation. Click 'Confirm' to schedule an appointment with our team.",
            });
            if (confirmed) {
              window.open("https://cal.com/yangatplasmic/csm", "_blank");
            }
            return;
          }

          // Ask the user to confirm their cancellation
          const cancelReason = await reactPrompt({
            message: `Can you tell us why you're cancelling? What could we have done better?`,
            rules: [
              {
                required: true,
              },
            ],
            placeholder: "Please don't hold back - we need to know the truth.",
          });
          if (!cancelReason) {
            return;
          }

          // Ask the user to confirm their cancellation
          const confirmed = await reactHardConfirm({
            title: "Cancel your Plasmic plan",
            message: `To cancel your plan, type 'cancel' into the textbox`,
            mustType: "cancel",
          });
          if (!confirmed) {
            return;
          }

          // Do the cancellation
          const teamId = ensure(
            team,
            `${ORGANIZATION_CAP} should exist to change subscription`
          ).id;
          await appCtx.api.cancelSubscription(teamId, {
            reason: cancelReason,
          });
          // Refresh the latest team data
          await onChange();
        },
        disabled: disabled,
      }}
      billingEmail={{
        value: billingEmail,
        onChange: (v) => setBillingEmail(v.target.value),
      }}
      updateBillingEmailButton={{
        onClick: async () => {
          if (!billingEmail) {
            return;
          }
          const teamId = ensure(
            team,
            `${ORGANIZATION_CAP} should exist to update billing email`
          ).id;
          await appCtx.api.updateTeam(teamId, {
            billingEmail,
          });
        },
        disabled: disabled,
      }}
    />
  );
}

const TeamBilling = React.forwardRef(TeamBilling_);
export default TeamBilling;
