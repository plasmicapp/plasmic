import { getOrgInitials } from "@/wab/client/components/dashboard/org-utils";
import { RawAvatar } from "@/wab/client/components/studio/Avatar";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  DefaultOrgSwitcherRowProps,
  PlasmicOrgSwitcherRow,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicOrgSwitcherRow";
import { ApiTeam } from "@/wab/shared/ApiSchema";
import {
  getExternalPriceTierName,
  getOrgStatus,
} from "@/wab/shared/pricing/pricing-utils";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { observer } from "mobx-react";
import * as React from "react";

export interface OrgSwitcherRowProps extends DefaultOrgSwitcherRowProps {
  org?: ApiTeam;
}

function OrgSwitcherRow_(
  props: OrgSwitcherRowProps,
  ref: HTMLElementRefOf<"div">,
) {
  const { org, ...rest } = props;
  const appCtx = useAppCtx();

  if (!org) {
    return <PlasmicOrgSwitcherRow root={{ ref }} {...rest} />;
  }

  const status = getOrgStatus(org, appCtx.appConfig.freeTrialDays);

  return (
    <PlasmicOrgSwitcherRow
      root={{ ref, "data-test-id": `org-switcher-row-${org.id}` }}
      {...rest}
      name={org.name}
      workspaceCount={
        appCtx.workspaces.filter((w) => w.team.id === org.id).length
      }
      plan={getExternalPriceTierName(org.featureTier?.name)}
      // Free orgs are the design's base state.
      status={status.status === "free" ? undefined : status.status}
      avatarContainer={
        <RawAvatar
          name={org.name}
          initials={getOrgInitials(org.name)}
          imgUrl={appCtx.appConfig.brands?.[org.id]?.logoImgSrc}
          size="small"
          showToolTip={false}
        />
      }
    />
  );
}

const OrgSwitcherRow = observer(React.forwardRef(OrgSwitcherRow_));
export default OrgSwitcherRow;
