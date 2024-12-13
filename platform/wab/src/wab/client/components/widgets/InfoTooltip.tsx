import { InlineIcon } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import InfoIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Info";
import { Popover } from "antd";
import { isFunction } from "lodash";
import React, { ReactNode } from "react";

export type InfoTooltipProps = {
  tooltip: ReactNode | (() => React.ReactNode);
};

export function InfoTooltip({ tooltip }: InfoTooltipProps) {
  return (
    <InlineIcon>
      <Popover
        trigger={["hover", "click"]}
        mouseEnterDelay={0.5}
        // Place it over dropdown menus (1050), since it can be inside dropdown menus (default is 1030)
        overlayStyle={{ zIndex: 1080 }}
        content={() => (
          <div style={{ maxWidth: 300 }}>
            {isFunction(tooltip) ? tooltip() : tooltip}
          </div>
        )}
      >
        <Icon icon={InfoIcon} className="dimfg pointer" />
      </Popover>
    </InlineIcon>
  );
}
