import {
  DefaultTeamPickerItemProps,
  PlasmicTeamPickerItem,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicTeamPickerItem";
import {
  getExternalPriceTier,
  NewPriceTierType,
} from "@/wab/shared/pricing/pricing-utils";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
interface TeamPickerItemProps extends DefaultTeamPickerItemProps {
  name: string;
  newTier: NewPriceTierType;
  onClick: () => void;
}

function TeamPickerItem_(
  props: TeamPickerItemProps,
  ref: HTMLElementRefOf<"div">
) {
  const { name, newTier, onClick, ...rest } = props;
  return (
    <PlasmicTeamPickerItem
      {...rest}
      teamName={name}
      newPriceTierChip={{
        tier: (
          <span className="text-xlg"> {getExternalPriceTier(newTier)} </span>
        ),
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
