import { Tooltip } from "antd";
import * as React from "react";
import {
  DefaultActionMenuButtonProps,
  PlasmicActionMenuButton,
} from "../../plasmic/plasmic_kit_design_system/PlasmicActionMenuButton";
import { IFrameAwareDropdownMenu } from "../widgets";

interface ActionMenuButtonProps extends DefaultActionMenuButtonProps {
  style?: React.CSSProperties;
  menu: React.ReactElement | (() => React.ReactElement);
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  target?: string;
  tooltip?: React.ReactNode;
}

const ActionMenuButton = React.forwardRef(function ActionMenuButton(
  props: ActionMenuButtonProps,
  ref: React.Ref<HTMLDivElement>
) {
  const { menu, onClick, href, target, tooltip, ...rest } = props;
  const [tooltipVisible, setTooltipVisible] = React.useState(false);
  const [menuVisible, setMenuVisible] = React.useState(false);

  return (
    <PlasmicActionMenuButton
      {...rest}
      actionButton={{
        props: { onClick, href, target, className: "btn-link" },
        as: href ? "a" : "button",
      }}
      menuTrigger={{
        wrap: (x) => (
          <IFrameAwareDropdownMenu
            menu={menu}
            onVisibleChange={(visible) => {
              setMenuVisible(visible);
              if (visible) {
                setTooltipVisible(false);
              }
            }}
          >
            {x}
          </IFrameAwareDropdownMenu>
        ),
      }}
      root={{
        props: {
          ref,
        },

        wrap: (x) =>
          tooltip ? (
            <Tooltip
              title={tooltip}
              visible={tooltipVisible}
              onVisibleChange={(visible) => {
                setTooltipVisible(visible && !menuVisible);
              }}
            >
              {x}
            </Tooltip>
          ) : (
            x
          ),
      }}
    />
  );
});

export default ActionMenuButton;
