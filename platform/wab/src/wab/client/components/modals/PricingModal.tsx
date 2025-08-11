import { AppCtx } from "@/wab/client/app-ctx";
import { isHostFrame } from "@/wab/client/cli-routes";
import TeamPicker from "@/wab/client/components/modals/TeamPicker";
import UpsellCheckout from "@/wab/client/components/modals/UpsellCheckout";
import UpsellConfirm from "@/wab/client/components/modals/UpsellConfirm";
import PriceTierPicker from "@/wab/client/components/pricing/PriceTierPicker";
import {
  showTemporaryInfo,
  showTemporaryPrompt,
} from "@/wab/client/components/quick-modals";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { useAsyncStrict } from "@/wab/client/hooks/useAsyncStrict";
import { getStripePromise } from "@/wab/client/stripe";
import {
  ApiFeatureTier,
  ApiTeam,
  ApiTeamMeta,
  BillingFrequency,
  MayTriggerPaywall,
} from "@/wab/shared/ApiSchema";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { ORGANIZATION_LOWER } from "@/wab/shared/Labels";
import { assert, assertNever, ensure } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  getExternalPriceTier,
  getNewPriceTierType,
  isUpgradableTier,
} from "@/wab/shared/pricing/pricing-utils";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import {
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { PaymentIntentResult, SetupIntentResult } from "@stripe/stripe-js";
import { Alert, Form } from "antd";
import * as React from "react";
import { MakeADT } from "ts-adt/MakeADT";

const DEFAULT_BILLING_FREQUENCY = "year";

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

type ErrorMsg = MakeADT<
  "type",
  {
    none: {};
    fatal: {
      errorMsg: string;
    };
    nonfatal: {
      errorMsg: string;
    };
  }
>;

export interface PromptBillingArgs {
  appCtx: AppCtx;
  // Modal title
  title: string;
  // Top-level description
  description?: string;
  // Subset of feature tiers that are compatible with your needs
  availableTiers: ApiFeatureTier[];
  target: {
    // Team to upgrade/downgrade
    team?: ApiTeam;
    // The tier the user wants to upgrade/downgrade to
    // If undefined, then ask the user
    initialTier?: ApiFeatureTier;
    initialBillingFreq?: BillingFrequency;
  };
}

export type TopBarPromptBillingArgs = Omit<PromptBillingArgs, "appCtx">;

export type PromptBillingResponse = MakeADT<
  "type",
  {
    success: {
      team: ApiTeam;
      tier: ApiFeatureTier;
    };
    fail: {
      errorMsg: string;
    };
  }
>;

/**
 * Load the upsell modal to handle upgrades/downgrades to a new team plan
 */
export async function promptBilling(
  props: PromptBillingArgs
): Promise<PromptBillingResponse | undefined> {
  return showTemporaryPrompt<PromptBillingResponse>((onSubmit, onCancel) => (
    // @ts-ignore
    <Elements stripe={getStripePromise()}>
      <UpsellForm {...props} onSubmit={onSubmit} onCancel={onCancel} />
    </Elements>
  ));
}

export async function getTiersAndPromptBilling(appCtx: AppCtx, team: ApiTeam) {
  const { tiers } = await appCtx.api.listCurrentFeatureTiers();
  await promptBilling({
    appCtx,
    title: "",
    target: {
      team,
    },
    availableTiers: tiers,
  });
}

export async function showUpsellConfirm(
  teamSettingsUrl: string
): Promise<void> {
  return showTemporaryInfo({
    title: "Payment confirmation",
    content: <UpsellConfirm teamSettingsUrl={teamSettingsUrl} />,
  });
}

function UpsellForm(
  props: PromptBillingArgs & {
    onSubmit: (v: PromptBillingResponse) => void;
    onCancel: () => void;
  }
) {
  const {
    appCtx,
    title,
    description,
    target,
    availableTiers,
    onSubmit,
    onCancel,
  } = props;

  const initErrorMsg = () =>
    isHostFrame()
      ? {
          type: "fatal" as const,
          errorMsg: `Please go to your ${ORGANIZATION_LOWER} settings page to adjust your plan.`,
        }
      : { type: "none" as const };
  const [errorMsg, setErrorMsg] = React.useState<ErrorMsg>(initErrorMsg());
  const resetErrorMsg = () => setErrorMsg(initErrorMsg());

  // The team we want to upsell
  const [team, rawSetTeam] = React.useState(target.team);
  const [teamMeta, setTeamMeta] = React.useState<ApiTeamMeta | undefined>(
    undefined
  );
  // The tier we want to upgrade/downgrade to
  const [tier, rawSetTier] = React.useState(target.initialTier);
  // monthly or annual billing
  const [billingFreq, setBillingFreq] = React.useState<BillingFrequency>(
    target.team?.billingFrequency ??
      target.initialBillingFreq ??
      DEFAULT_BILLING_FREQUENCY
  );
  // The total number of seats in our subscription
  const [seats, setSeats] = React.useState(
    Math.min(
      tier?.maxUsers ?? Infinity,
      Math.max(
        team?.seats ?? 1,
        teamMeta?.memberCount ?? 1,
        tier?.minUsers ?? 1
      )
    )
  );

  React.useEffect(() => {
    if (teamMeta && tier?.maxUsers && teamMeta.memberCount > tier.maxUsers) {
      setErrorMsg({
        type: "fatal",
        errorMsg: `Your ${ORGANIZATION_LOWER} has more members (${teamMeta.memberCount}) than available seats (${tier.maxUsers}) for this tier. Please go to your ${ORGANIZATION_LOWER} settings and select a higher plan tier.`,
      });
    }
  }, [tier, teamMeta]);

  const safeSetSeats = (newSeats: number) => {
    if (tier?.maxUsers && tier.maxUsers < newSeats) {
      setErrorMsg({
        type: "nonfatal",
        errorMsg: `If you want more seats, please go to your ${ORGANIZATION_LOWER} settings and upgrade to a higher plan tier.`,
      });
      setSeats(tier.maxUsers);
    } else if (tier?.minUsers && newSeats < tier.minUsers) {
      setErrorMsg({
        type: "nonfatal",
        errorMsg: "You've hit the minimum seat count for this tier.",
      });
      setSeats(tier.minUsers);
    } else {
      setSeats(newSeats);
    }
  };

  const setTeam = (t: ApiTeam, meta: ApiTeamMeta) => {
    resetErrorMsg();
    rawSetTeam(t);
    setTeamMeta(meta);
    const teamSeats = t.seats ?? 1;
    const teamMemberCount = meta.memberCount;
    const minUsers = tier?.minUsers ?? 1;
    safeSetSeats(Math.max(seats, teamSeats, teamMemberCount, minUsers));
    if (t.billingFrequency) {
      setBillingFreq(t.billingFrequency);
    }
  };
  const setTier = (t?: ApiFeatureTier) => {
    resetErrorMsg();
    safeSetSeats(
      Math.min(t?.maxUsers ?? Infinity, Math.max(seats, t?.minUsers ?? 1))
    );
    rawSetTier(t);
  };

  // Set when we are waiting from the server (disabling the form)
  const [waiting, setWaiting] = React.useState<boolean>(false);
  const stripe = useStripe();
  const elements = useElements();

  useAsyncStrict(async () => {
    if (teamMeta || !target.team) {
      return;
    }

    setWaiting(true);
    try {
      const { meta } = await appCtx.api.getTeamMeta(target.team.id);
      setTeamMeta(meta);
    } finally {
      setWaiting(false);
    }
  }, [teamMeta, target]);

  // true if team is on a valid active subscription already
  // - Currently we don't ask for a credit card if true (using default payment method)
  // - If false, then we should ask for a new credit card
  // Note: the server will make sure this field is undefined if Stripe says the subscription is invalid
  const hasActiveSubscription =
    !!team?.featureTierId && !!team?.stripeSubscriptionId;

  /**
   * Change the subscription on the server.
   * This is a terminating function. Either way the modal will be dismissed.
   * @param targetTeam
   * @param targetTier
   * @returns
   */
  const changeExistingSubscription = async (
    targetTeam: ApiTeam,
    targetTier: ApiFeatureTier
  ) => {
    const changeResp = await appCtx.api.changeSubscription({
      teamId: targetTeam.id,
      featureTierId: targetTier.id,
      billingFrequency: billingFreq,
      seats,
    });
    switch (changeResp.type) {
      case "notFound":
        return onSubmit({
          type: "fail",
          errorMsg: `Couldn't find your subscription. Please go to your ${ORGANIZATION_LOWER} settings, cancel the subscription, and try again.`,
        });
      case "success":
        return onSubmit({
          type: "success",
          team: targetTeam,
          tier: targetTier,
        });
      default:
        return assertNever(changeResp);
    }
  };

  const startFreeTrial = async () => {
    if (!team) {
      return;
    }
    await appCtx.api.startFreeTrial(team?.id);
    await appCtx.reloadAppCtx();
    return onSubmit({
      type: "success",
      team: team,
      tier: ensure(
        availableTiers.find((t) => t.name === DEVFLAGS.freeTrialTierName),
        "Free trial tier should be one of the available"
      ),
    });
  };

  const confirmBill = async () => {
    setWaiting(true);
    try {
      const ensureTeam = ensure(
        team,
        `You must first select an ${ORGANIZATION_LOWER}`
      );
      const ensureTier = ensure(tier, "You must first select a tier");

      assert(
        !ensureTier.maxUsers || seats <= ensureTier.maxUsers,
        `Exceeded maximum seats for this tier, if you want more seats, please go to your ${ORGANIZATION_LOWER} settings and upgrade to a higher plan tier.`
      );

      if (hasActiveSubscription) {
        return changeExistingSubscription(ensureTeam, ensureTier);
      }

      const createResp = await appCtx.api.createSubscription({
        teamId: ensureTeam.id,
        featureTierId: ensureTier.id,
        billingFrequency: billingFreq,
        seats,
      });

      // Subscription already exists. Let's try to change it
      if (createResp.type === "alreadyExists") {
        return changeExistingSubscription(ensureTeam, ensureTier);
      }

      // This is a new subscription. Let's try to confirm it with the credit card.
      const { clientSecret } = createResp;
      const ensureClientSecret = ensure(
        clientSecret,
        "Missing client secret from server"
      );
      const ensureStripe = ensure(stripe, "Stripe not loaded yet");
      const ensureElements = ensure(elements, "Stripe not loaded yet");
      const card = ensure(
        ensureElements.getElement(CardNumberElement),
        "Issue getting CC info from form"
      );
      const result =
        createResp.type === "success"
          ? await ensureStripe.confirmCardSetup(ensureClientSecret, {
              payment_method: { card },
            })
          : await ensureStripe.confirmCardPayment(ensureClientSecret, {
              payment_method: { card },
            });
      if (result.error) {
        return setErrorMsg({
          type: "nonfatal",
          errorMsg:
            result.error.message ??
            "Error processing payment. Please contact help@plasmic.app.",
        });
      }
      const intent = ensure(
        createResp.type === "success"
          ? (result as SetupIntentResult).setupIntent
          : (result as PaymentIntentResult).paymentIntent,
        "intent must exist if didnt throw error"
      );
      if (intent.status !== "succeeded") {
        return onSubmit({
          type: "fail",
          errorMsg: "Unknown error processing payment. Please try again.",
        });
      }

      // Save as default payment method for all future upgrades
      const paymentMethodId = intent.payment_method;
      if (paymentMethodId) {
        await appCtx.api.updatePaymentMethod(ensureTeam.id, paymentMethodId);
      }
      return onSubmit({
        type: "success",
        team: ensureTeam,
        tier: ensureTier,
      });
    } finally {
      setWaiting(false);
    }
  };

  // If I just created the team, assume I can edit it
  const canUpdateBilling = !team ? true : canIEditTeam(appCtx, team);

  return (
    <Modal
      title={title}
      visible={true}
      footer={null}
      onCancel={() => onCancel()}
      width={"max-content"}
    >
      <div style={{ margin: "20px 0", minWidth: "400px" }}>
        {errorMsg.type !== "none" && (
          <div style={{ margin: "0 0 20px 0" }}>
            <Alert message={errorMsg.errorMsg} type="error" />
          </div>
        )}
        {description && <p>{description}</p>}
        {errorMsg.type !== "fatal" && !team && (
          <TeamPicker
            appCtx={appCtx}
            onSelect={async (t: ApiTeam) => {
              setWaiting(true);
              // Needed to reload appCtx.perms
              await appCtx.reloadAppCtx();
              const { meta } = await appCtx.api.getTeamMeta(t.id);
              setTeam(t, meta);
              setWaiting(false);
            }}
            teamFilter={(t) => canUpgradeTeam(appCtx, t)}
            disabled={waiting}
          />
        )}
        {errorMsg.type !== "fatal" && team && !tier && (
          // Haven't chosen a tier yet
          <PriceTierPicker
            // Only show tiers that support this many seats
            appCtx={appCtx}
            availableTiers={availableTiers.filter(
              (t) =>
                !t.maxUsers ||
                !teamMeta?.memberCount ||
                teamMeta.memberCount <= t.maxUsers
            )}
            billingFrequency={billingFreq}
            showBillingFrequencyToggle={{
              disabled: hasActiveSubscription,
              onSetBillingFreq: setBillingFreq,
            }}
            currentFeatureTier={team.featureTier ?? undefined}
            disabled={!canUpdateBilling}
            onSelectFeatureTier={async (newTier: ApiFeatureTier) =>
              setTier(newTier)
            }
            canStartFreeTrial={!team.trialStartDate}
            onStartFreeTrial={startFreeTrial}
            isFreeTrialTeam={team?.onTrial}
            hideLegacyTier={true}
            titleBar={{
              show: true,
              teamName: team.name,
            }}
          />
        )}
        {errorMsg.type !== "fatal" && team && tier && (
          // Chose a tier to upgrade/downgrade to
          <Form>
            <UpsellCheckout
              appCtx={appCtx}
              disabled={waiting || !canUpdateBilling}
              hasActiveSubscription={hasActiveSubscription}
              onFreeTrial={team?.onTrial}
              teamName={team.name}
              currentTier={team.featureTier}
              tier={tier}
              seats={seats}
              onSetSeats={(s) => {
                if (
                  !team ||
                  s <
                    ensure(
                      teamMeta?.memberCount,
                      "teamMeta needs to be populated"
                    )
                ) {
                  return;
                }
                safeSetSeats(s);
              }}
              // If there's a stripe secret, we need to ask for CC info
              skipCreditCard={hasActiveSubscription}
              billingFreq={billingFreq}
              onSetBillingFreq={setBillingFreq}
              // If I'm on a paid tier already, don't let me change this
              onSubmit={confirmBill}
              onCancel={onCancel}
              onResetTier={async () => setTier(undefined)}
            />
          </Form>
        )}
      </div>
      {errorMsg.type !== "fatal" && team && !canUpdateBilling && (
        <Alert
          message={`You have no permission to update billing for this ${ORGANIZATION_LOWER}. Please ask an ${ORGANIZATION_LOWER} administrator to do it.`}
          type="warning"
        />
      )}
    </Modal>
  );
}

export class PaywallError extends Error {
  constructor(
    public type: "requireTeam" | "billing",
    msg: string,
    public feature?: string
  ) {
    super(msg);
  }
}

function getPaywallProperDescription(description: string) {
  const freeTrialName = getExternalPriceTier(
    getNewPriceTierType(DEVFLAGS.freeTrialTierName)
  );
  switch (description) {
    case "splitContentAccess":
      return `This project is using A/B testing or custom targeting. Please upgrade to a ${freeTrialName} or Enterprise plan to publish this project.`;
    case "monthlyViewLimit":
      return `This project/${ORGANIZATION_LOWER} has reached the monthly view limit. Please upgrade to a ${freeTrialName} or Enterprise plan to publish this project.`;
    default:
      return undefined;
  }
}

export async function maybeShowPaywall<T>(
  appCtx: AppCtx,
  action: () => Promise<MayTriggerPaywall<T>>,
  args: Omit<PromptBillingArgs, "appCtx" | "target" | "availableTiers"> = {
    title: "Upgrade to perform this action",
    description: "Select a new plan to upgrade.",
  },
  useTopFrame = false
): Promise<T> {
  const res = await action();
  if (res.paywall === "pass") {
    return res.response;
  }

  if (res.paywall === "requireTeam") {
    throw new PaywallError(
      "requireTeam",
      `This action requires an ${ORGANIZATION_LOWER}.`,
      res.description
    );
  }

  const extendedDescription = getPaywallProperDescription(res.description);

  if (extendedDescription) {
    args.description = extendedDescription;
  }

  if (useTopFrame) {
    const topFrameApi = ensure(appCtx.topFrameApi, "missing topFrameApi");
    await topFrameApi.setShowUpsellForm({
      ...args,
      availableTiers: res.features,
      target: {
        team: res.team,
        initialTier:
          res.team?.featureTier &&
          res.features.map((f) => f.name).includes(res.team.featureTier.name)
            ? res.team.featureTier
            : undefined,
      },
    });

    const teamId = res.team?.id;

    // `"requireTeam"` should capture this case
    // We throw an error here since we gave the modal to the top frame
    if (!teamId) {
      throw new PaywallError(
        "billing",
        `You need to create an ${ORGANIZATION_LOWER} to perform this action.`
      );
    }

    throw new PaywallError(
      "billing",
      "Billing is required to perform this action"
    );
  }

  const billing = await promptBilling({
    appCtx,
    ...args,
    availableTiers: res.features,
    target: {
      team: res.team,
      initialTier:
        res.team?.featureTier &&
        res.features.map((f) => f.name).includes(res.team.featureTier.name)
          ? res.team.featureTier
          : undefined,
    },
  });

  if (!billing) {
    throw new PaywallError(
      "billing",
      "Unable to perform action. It requires a plan upgrade."
    );
  } else if (billing.type === "fail") {
    throw new PaywallError(
      "billing",
      billing.errorMsg ||
        "Unable to upgrade plan. Please try again or contact team@plasmic.app."
    );
  }
  await showUpsellConfirm(
    fillRoute(APP_ROUTES.orgSettings, { teamId: billing.team.id })
  );

  return maybeShowPaywall(appCtx, action, args);
}
