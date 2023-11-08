import { Dropdown, Tooltip } from "antd";
import * as React from "react";

export interface DropdownTooltipProps
  extends React.ComponentProps<typeof Dropdown> {
  title?: React.ReactNode;
}

/**
 * Combination of Dropdown and Tooltip that hides the Tooltip when the Dropdown
 * is shown
 */
export function DropdownTooltip(props: DropdownTooltipProps) {
  const { title, children, overlay, ...rest } = props;
  const [isDropdownOpen, setDropdownOpen] = React.useState(false);
  const [isTooltipShown, setTooltipShown] = React.useState(false);
  return (
    <Dropdown
      {...rest}
      visible={isDropdownOpen}
      onVisibleChange={(visible) => {
        setDropdownOpen(visible);
        if (!visible) {
          setTooltipShown(false);
        }
      }}
      overlay={() => {
        const elt =
          typeof overlay === "function"
            ? overlay()
            : (overlay as React.ReactElement);
        return React.cloneElement(elt, {
          onClick: (e: any) => {
            elt.props.onClick?.(e);
            setDropdownOpen(false);
            setTooltipShown(false);
          },
        });
      }}
    >
      <Tooltip
        title={title}
        visible={isTooltipShown && !isDropdownOpen}
        onVisibleChange={(visible) => setTooltipShown(visible)}
      >
        {children}
      </Tooltip>
    </Dropdown>
  );
}
