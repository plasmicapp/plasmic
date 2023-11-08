import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import {
  NewPriceTierType,
  PriceTierType,
} from "../../../shared/pricing/pricing-utils";
import { capitalizeFirst } from "../../../strs";
import {
  DefaultTeamPickerItemProps,
  PlasmicTeamPickerItem,
} from "../../plasmic/plasmic_kit_dashboard/PlasmicTeamPickerItem";
interface TeamPickerItemProps extends DefaultTeamPickerItemProps {
  name: string;
  tier: PriceTierType;
  newTier: NewPriceTierType;
  onClick: () => void;
}

function TeamPickerItem_(
  props: TeamPickerItemProps,
  ref: HTMLElementRefOf<"div">
) {
  const { name, tier, newTier, onClick, ...rest } = props;
  return (
    <PlasmicTeamPickerItem
      {...rest}
      teamName={name}
      newPriceTierChip={{
        tier: <span className="text-xlg"> {capitalizeFirst(newTier)} </span>,
      }}
      root={{
        ref,
        onClick,
      }}
    />
  );
}

const TeamPickerItem = React.forwardRef(TeamPickerItem_);
export default TeamPickerItem;
