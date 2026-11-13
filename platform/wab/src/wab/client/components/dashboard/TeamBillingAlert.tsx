import { useTeamSubscription } from "@/wab/client/api-hooks";
import styles from "@/wab/client/components/dashboard/TeamBillingAlert.module.scss";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import WarningTriangleSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__WarningTriangleSvg";
import { ApiPermission, ApiTeam } from "@/wab/shared/ApiSchema";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { getSubscriptionStatus } from "@/wab/shared/billing/billing-util";
import { getAccessLevelToResource } from "@/wab/shared/perms";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { Tooltip } from "antd";
import * as React from "react";

function useTeamBillingError(
  team: ApiTeam,
  perms: ApiPermission[],
  opts?: { poll?: boolean },
) {
  const appCtx = useAppCtx();
  const accessLevel = getAccessLevelToResource(
    { type: "team", resource: team },
    appCtx.selfInfo,
    perms,
  );
  const { data: subscription } = useTeamSubscription(
    appCtx,
    accessLevelRank(accessLevel) >= accessLevelRank("editor")
      ? team.id
      : undefined,
    opts,
  );
  if (
    !subscription ||
    accessLevelRank(accessLevel) < accessLevelRank("editor")
  ) {
    return null;
  }
  const status = getSubscriptionStatus({
    ...subscription.team,
    ...subscription,
  });
  return status.type === "invalid"
    ? { ...status, billingTeamId: subscription.billingTeamId }
    : null;
}

export function TeamBillingAlert(props: {
  team: ApiTeam;
  perms: ApiPermission[];
}) {
  const status = useTeamBillingError(props.team, props.perms);
  return status ? (
    <div role="alert" className={styles.root}>
      <span>{status.errorMsg}</span>
      <a
        className={styles.manageBilling}
        href={APP_ROUTES.orgBilling.fill({
          teamId: status.billingTeamId,
        })}
        target="_blank"
        rel="noopener noreferrer"
      >
        Manage billing
      </a>
    </div>
  ) : null;
}

export function TeamBillingAlertHeader(props: {
  team: ApiTeam;
  children: React.ReactNode;
}) {
  const appCtx = useAppCtx();
  return (
    <div className={styles.stickyHeader}>
      <TeamBillingAlert team={props.team} perms={appCtx.perms} />
      {props.children}
    </div>
  );
}

export function TeamBillingErrorIcon({ team }: { team: ApiTeam }) {
  const appCtx = useAppCtx();
  // One icon per org; fetch once instead of polling each one.
  const status = useTeamBillingError(team, appCtx.perms, { poll: false });
  return status ? (
    <Tooltip title={status.errorMsg}>
      <WarningTriangleSvgIcon
        role="img"
        aria-label="Billing error"
        className={styles.errorIcon}
      />
    </Tooltip>
  ) : null;
}
