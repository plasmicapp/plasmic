import OrgSwitcherRow from "@/wab/client/components/dashboard/OrgSwitcherRow";
import { promptNewTeam } from "@/wab/client/components/dashboard/dashboard-actions";
import { getOrgInitials } from "@/wab/client/components/dashboard/org-utils";
import { CreateNewMenuItemContent } from "@/wab/client/components/menu-builder";
import {
  canUpgradeTeam,
  promptTeamUpgrade,
} from "@/wab/client/components/modals/PricingModal";
import { RawAvatar } from "@/wab/client/components/studio/Avatar";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultOrgSwitcherProps,
  PlasmicOrgSwitcher,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicOrgSwitcher";
import { useHistory } from "@/wab/client/route/HistoryProvider";
import { ApiTeam, TeamId } from "@/wab/shared/ApiSchema";
import { spawn } from "@/wab/shared/common";
import {
  getExternalPriceTierName,
  getOrgStatus,
} from "@/wab/shared/pricing/pricing-utils";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { Dropdown, MenuProps } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

const CREATE_ORG_KEY = "create";

export interface OrgSwitcherProps extends DefaultOrgSwitcherProps {
  selectedOrg?: ApiTeam;
  orgs?: ApiTeam[];
}

function OrgSwitcher_(props: OrgSwitcherProps, ref: HTMLElementRefOf<"div">) {
  const { selectedOrg, orgs = [], ...rest } = props;
  const appCtx = useAppCtx();
  const history = useHistory();
  const [open, setOpen] = React.useState(false);

  const createOrg = () => spawn(promptNewTeam(appCtx, history));

  if (!selectedOrg) {
    return (
      <PlasmicOrgSwitcher
        root={{ ref }}
        className={rest.className}
        createOrgButton={{ props: { onClick: createOrg } }}
        hasNoOrg={true}
      />
    );
  }

  const status = getOrgStatus(selectedOrg, appCtx.appConfig.freeTrialDays);

  const menu: MenuProps = {
    selectedKeys: [selectedOrg.id],
    items: [
      ...orgs.map((org) => ({
        key: org.id,
        label: (
          <OrgSwitcherRow org={org} selected={org.id === selectedOrg.id} />
        ),
      })),
      { type: "divider" as const },
      {
        key: CREATE_ORG_KEY,
        label: <CreateNewMenuItemContent entity="organization" />,
      },
    ],
    onClick: ({ key }) => {
      setOpen(false);
      if (key === CREATE_ORG_KEY) {
        createOrg();
      } else {
        history.push(APP_ROUTES.org.fill({ teamId: key as TeamId }));
      }
    },
  };

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      autoFocus
      trigger={["click"]}
      placement="bottomLeft"
      menu={menu}
    >
      <PlasmicOrgSwitcher
        root={{ ref }}
        switchButton={{
          props: {
            "aria-haspopup": "menu",
            "aria-expanded": open,
            "data-test-id": "org-switcher-trigger",
            onClick: () => setOpen((o) => !o),
          },
        }}
        createOrgButton={{ props: { onClick: createOrg } }}
        upgradeBtn={{
          props: {
            "data-test-id": "org-switcher-upgrade",
            onClick: () => spawn(promptTeamUpgrade(appCtx, selectedOrg)),
          },
        }}
        {...rest}
        hasNoOrg={false}
        name={selectedOrg.name}
        plan={getExternalPriceTierName(selectedOrg.featureTier?.name)}
        // Free orgs are the design's base state.
        status={status.status === "free" ? undefined : status.status}
        trialDaysLeft={
          status.status === "trial" ? status.trialDaysLeft : undefined
        }
        canUpgrade={
          status.status !== "paid" && canUpgradeTeam(appCtx, selectedOrg)
        }
        avatar={
          <RawAvatar
            name={selectedOrg.name}
            initials={getOrgInitials(selectedOrg.name)}
            imgUrl={appCtx.appConfig.brands?.[selectedOrg.id]?.logoImgSrc}
            showToolTip={false}
          />
        }
      />
    </Dropdown>
  );
}

const OrgSwitcher = observer(React.forwardRef(OrgSwitcher_));
export default OrgSwitcher;
