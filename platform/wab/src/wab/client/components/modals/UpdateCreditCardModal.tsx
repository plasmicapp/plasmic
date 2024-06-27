import { AppCtx } from "@/wab/client/app-ctx";
import UpsellCreditCard from "@/wab/client/components/modals/UpsellCreditCard";
import { showTemporaryPrompt } from "@/wab/client/components/quick-modals";
import { getStripePromise } from "@/wab/client/deps-client";
import { ensure } from "@/wab/shared/common";
import { ApiTeam } from "@/wab/shared/ApiSchema";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { isUpgradableTier } from "@/wab/shared/pricing/pricing-utils";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import * as React from "react";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { MakeADT } from "ts-adt/MakeADT";

export const canIEditTeam = (appCtx: AppCtx, t: ApiTeam) =>
  accessLevelRank(
    appCtx.perms.find(
      (p) =>
        p.teamId === t.id &&
        p.userId === ensure(appCtx.selfInfo, "User must be authenticated").id
    )?.accessLevel || "blocked"
  ) >= accessLevelRank("editor");

export const canUpgradeTeam = (appCtx: AppCtx, t: ApiTeam) =>
  canIEditTeam(appCtx, t) && (isUpgradableTier(t.featureTier) || t.onTrial);

export interface PromptUpdateCcArgs {
  appCtx: AppCtx;
  // Modal title
  title: string;
  // Top-level description
  description?: string;

  team: ApiTeam;
}

export type PromptUpdateCcResponse = MakeADT<
  "type",
  {
    success: {};
    fail: {
      errorMsg: string;
    };
  }
>;

/**
 * Load the upsell modal to handle upgrades/downgrades to a new team plan
 */

export async function promptUpdateCc(
  props: PromptUpdateCcArgs
): Promise<PromptUpdateCcResponse | undefined> {
  return showTemporaryPrompt<PromptUpdateCcResponse>((onSubmit, onCancel) => (
    // @ts-ignore
    <Elements stripe={getStripePromise()}>
      <UpsellCreditCardForm
        {...props}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </Elements>
  ));
}

function UpsellCreditCardForm(
  props: PromptUpdateCcArgs & {
    onSubmit: (v: PromptUpdateCcResponse) => void;
    onCancel: () => void;
  }
) {
  const { appCtx, title, description, team, onSubmit, onCancel } = props;

  // Set when we are waiting from the server (disabling the form)
  const [waiting, setWaiting] = React.useState<boolean>(false);
  const stripe = useStripe();
  const elements = useElements();

  const confirmBill = async () => {
    setWaiting(true);
    // This is a new subscription. Let's try to confirm it with the credit card.
    const pendingSetupIntent = await appCtx.api.createSetupIntent(team.id);
    const clientSecret = ensure(
      pendingSetupIntent.client_secret,
      "missing client secret"
    );
    const ensureStripe = ensure(stripe, "Stripe not loaded yet");
    const ensureElements = ensure(elements, "Stripe not loaded yet");
    const card = ensure(
      ensureElements.getElement(CardElement),
      "Issue getting CC info from form"
    );
    const result = await ensureStripe.confirmCardSetup(clientSecret, {
      payment_method: { card },
    });
    if (result.error) {
      return onSubmit({
        type: "fail",
        errorMsg:
          result.error.message ??
          "Error processing payment. Please contact help@plasmic.app.",
      });
    }
    if (result.setupIntent.status !== "succeeded") {
      return onSubmit({
        type: "fail",
        errorMsg: "Unknown error processing credit card. Please try again.",
      });
    }

    // Save as default payment method for all future upgrades
    const paymentMethodId = result.setupIntent.payment_method;
    if (paymentMethodId) {
      await appCtx.api.updatePaymentMethod(team.id, paymentMethodId);
    }
    return onSubmit({
      type: "success",
    });
  };

  ensure(canIEditTeam(appCtx, team), "need permission to update credit card");

  return (
    <Modal
      title={title}
      visible={true}
      footer={null}
      onCancel={() => onCancel()}
      width={"max-content"}
    >
      <div style={{ margin: "20px 0", minWidth: "400px" }}>
        {description && <p>{description}</p>}
        {
          // Chose a tier to upgrade/downgrade to
          <UpsellCreditCard onSubmit={confirmBill} disabled={waiting} />
        }
      </div>
    </Modal>
  );
}
