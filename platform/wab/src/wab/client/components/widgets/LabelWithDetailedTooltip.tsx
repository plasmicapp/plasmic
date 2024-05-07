import { InlineIcon } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import InfoIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Info";
import { Popover } from "antd";
import { isFunction } from "lodash";
import React, { ReactNode } from "react";

export function LabelWithDetailedTooltip(props: {
  tooltip: ReactNode | (() => React.ReactNode);
  children: ReactNode;
}) {
  return (
    <div className={"flex flex-vcenter"}>
      {props.children}
      <div className={"ml-xsm inline-block"}>
        <InlineIcon>
          <Popover
            trigger={["hover", "click"]}
            mouseEnterDelay={0.5}
            // Place it over dropdown menus (1050), since it can be inside dropdown menus (default is 1030)
            overlayStyle={{ zIndex: 1080 }}
            content={() => (
              <div style={{ maxWidth: 300 }}>
                {isFunction(props.tooltip) ? props.tooltip() : props.tooltip}
              </div>
            )}
          >
            <Icon icon={InfoIcon} className="dimfg pointer" />
          </Popover>
        </InlineIcon>
      </div>
    </div>
  );
}
