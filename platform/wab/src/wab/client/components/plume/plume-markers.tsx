import { Tooltip } from "antd";
import * as React from "react";
import { MaybeWrap } from "../../../commons/components/ReactUtil";
import {
  PlumeElementDef,
  PlumeSlotDef,
  PlumeVariantDef,
} from "../../../shared/plume/plume-registry";
import InfoIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Info";
import PlumeMarkIcon from "../../plasmic/plasmic_kit_design_system/icons/PlasmicIcon__PlumeMark";
import { Icon } from "../widgets/Icon";

export function PlumeMarker(props: {
  def: PlumeVariantDef | PlumeSlotDef | PlumeElementDef;
}) {
  const { def } = props;
  return (
    <Tooltip title={def.info}>
      <Icon icon={InfoIcon} />
    </Tooltip>
  );
}

export function PlumyIcon(props: {
  def?: PlumeVariantDef | PlumeSlotDef | PlumeElementDef;
  children: React.ReactNode;
}) {
  const { def, children } = props;
  return (
    <MaybeWrap
      cond={!!def}
      wrapper={(x) => <Tooltip title={def?.info}>{x}</Tooltip>}
    >
      <div className="rel">
        {children}
        <Icon
          icon={PlumeMarkIcon}
          style={{
            position: "absolute",
            right: -4,
            bottom: -4,
            width: 12,
          }}
        />
      </div>
    </MaybeWrap>
  );
}
