import DefaultLayout, {
  DefaultLayoutProps,
} from "@/wab/client/components/dashboard/DefaultLayout";
import {
  canUpgradeTeam,
  getTiersAndPromptBilling,
} from "@/wab/client/components/modals/PricingModal";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import { spawn } from "@/wab/shared/common";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { observer } from "mobx-react";
import * as React from "react";
import type { SetRequired } from "type-fest";

export type DefaultTeamLayoutProps = SetRequired<DefaultLayoutProps, "team">;

function DefaultTeamLayout_(
  props: DefaultTeamLayoutProps,
  ref: HTMLElementRefOf<"div">
) {
  const { team, ...rest } = props;
  const appCtx = useAppCtx();

  return (
    <DefaultLayout
      ref={ref}
      {...rest}
      team={team}
      freeTrial={{ team }}
      upgradeButton={
        canUpgradeTeam(appCtx, team)
          ? {
              onClick: () => spawn(getTiersAndPromptBilling(appCtx, team)),
            }
          : undefined
      }
      helpButton={
        // Support is per org, so the playground (personal team) has none.
        team.personalTeamOwnerId
          ? { render: () => null }
          : {
              props: {
                href: APP_ROUTES.orgSupport.fill({ teamId: team.id }),
              },
            }
      }
    />
  );
}

const DefaultTeamLayout = observer(React.forwardRef(DefaultTeamLayout_));
export default DefaultTeamLayout;
