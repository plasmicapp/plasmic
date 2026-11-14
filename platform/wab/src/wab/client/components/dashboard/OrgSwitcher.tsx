import OrgSwitcherRow from "@/wab/client/components/dashboard/OrgSwitcherRow";
import { getOrgInitials } from "@/wab/client/components/dashboard/org-utils";
import { CreateNewMenuItemContent } from "@/wab/client/components/menu-builder";
import { canUpgradeTeam } from "@/wab/client/components/modals/PricingModal";
import { RawAvatar } from "@/wab/client/components/studio/Avatar";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultOrgSwitcherProps,
  PlasmicOrgSwitcher,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicOrgSwitcher";
import { ApiTeam } from "@/wab/shared/ApiSchema";
import {
  getExternalPriceTierName,
  getOrgStatus,
} from "@/wab/shared/pricing/pricing-utils";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { Dropdown, MenuProps } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

const CREATE_ORG_KEY = "create";

export interface OrgSwitcherProps extends DefaultOrgSwitcherProps {
  selectedOrg?: ApiTeam;
  orgs?: ApiTeam[];
  onSelectOrg?: (org: ApiTeam) => void;
  onCreateOrg?: () => void;
  onUpgradeOrg?: (org: ApiTeam) => void;
}

function OrgSwitcher_(props: OrgSwitcherProps, ref: HTMLElementRefOf<"div">) {
  const {
    selectedOrg,
    orgs = [],
    onSelectOrg,
    onCreateOrg,
    onUpgradeOrg,
    ...rest
  } = props;
  const appCtx = useAppCtx();
  const [open, setOpen] = React.useState(false);

  const createOrgButton = onCreateOrg
    ? { props: { onClick: onCreateOrg } }
    : { render: () => null };

  if (!selectedOrg) {
    return (
      <PlasmicOrgSwitcher
        root={{ ref }}
        className={rest.className}
        createOrgButton={createOrgButton}
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
      ...(onCreateOrg
        ? [
            { type: "divider" as const },
            {
              key: CREATE_ORG_KEY,
              label: <CreateNewMenuItemContent entity="organization" />,
            },
          ]
        : []),
    ],
    onClick: ({ key }) => {
      setOpen(false);
      if (key === CREATE_ORG_KEY) {
        onCreateOrg?.();
        return;
      }
      const org = orgs.find((o) => o.id === key);
      if (org) {
        onSelectOrg?.(org);
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
        createOrgButton={createOrgButton}
        upgradeBtn={{
          props: {
            "data-test-id": "org-switcher-upgrade",
            onClick: () => onUpgradeOrg?.(selectedOrg),
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
          !!onUpgradeOrg &&
          status.status !== "paid" &&
          canUpgradeTeam(appCtx, selectedOrg)
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
