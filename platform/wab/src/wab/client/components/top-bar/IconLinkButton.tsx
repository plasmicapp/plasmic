import { Dropdown, Tooltip } from "antd";
import classNames from "classnames";
import * as React from "react";
import { ReactNode } from "react";
import { swallowClick } from "../../../commons/components/ReactUtil";
import { plasmicIFrameMouseDownEvent } from "../../definitions/events";
import TriangleBottomIcon from "../../plasmic/plasmic_kit/PlasmicIcon__TriangleBottom";
import { maybeShowContextMenu } from "../ContextMenu";
import * as widgets from "../widgets";
import { PlainLinkButtonProps } from "../widgets";
import { Icon } from "../widgets/Icon";

interface IconLinkButtonProps extends Omit<PlainLinkButtonProps, "title"> {
  label?: ReactNode;
  icon?: ReactNode;
  faPrefix?: string;
  isActive?: boolean;
  menu?: React.ReactElement | (() => React.ReactElement);
  title?: React.ReactNode;
  dataTestId?: string;
}

export function IconLinkButton(props: IconLinkButtonProps) {
  const {
    label,
    icon,
    faPrefix,
    isActive,
    menu,
    title,
    className,
    ...plainButtonProps
  } = props;

  // We want to hide the tooltip when we show the dropdown, because they
  // overlap each other.
  const [showingDropdown, setShowingDropdown] = React.useState(false);
  const [showingTooltip, setShowingTooltip] = React.useState(false);

  const onTooltipVisibleChange = React.useCallback(
    (v) => setShowingTooltip(v),
    []
  );
  const onDropdownVisibleChange = React.useCallback(
    (v) => setShowingDropdown(v),
    []
  );

  React.useEffect(() => {
    const handler = () => {
      setShowingTooltip(false);
      setShowingDropdown(false);
    };
    if (menu) {
      document.addEventListener(plasmicIFrameMouseDownEvent, handler);
      return () => {
        document.removeEventListener(plasmicIFrameMouseDownEvent, handler);
      };
    }
    return;
  });

  const buttonContent = (
    <>
      {icon && <span className={"toolbar-icon no-line-height"}>{icon}</span>}
      {label && (
        <span className={"top-bar__minor-label icon-link-btn__label"}>
          {label}
        </span>
      )}
    </>
  );

  const wrapTooltip = (node: React.ReactNode) => (
    <Tooltip
      title={title}
      visible={showingTooltip && !showingDropdown}
      onVisibleChange={onTooltipVisibleChange}
      placement={"bottom"}
    >
      {node as React.ReactElement}
    </Tooltip>
  );

  const outerClassName = classNames({
    "icon-link-btn icon-link-btn--inverse": true,
    "icon-link-btn--active": isActive,
    "icon-link-btn--disabled": props.disabled,
    [className || ""]: true,
  });

  if (props.onClick && menu) {
    // Two buttons if there's both an onClick (default action) and a menu
    // (additional dropdown options).
    return wrapTooltip(
      <div
        className={outerClassName}
        onContextMenu={(e) => maybeShowContextMenu(e.nativeEvent, menu)}
      >
        <widgets.PlainLinkButton
          {...plainButtonProps}
          className={icon && !label ? "no-line-height" : ""}
        >
          {buttonContent}
        </widgets.PlainLinkButton>
        <div
          onClick={() => {
            // On menu select, no longer show dropdown
            if (showingDropdown) {
              setShowingDropdown(false);
            }
          }}
        >
          <Dropdown
            trigger={["click"]}
            overlay={menu}
            visible={showingDropdown}
            onVisibleChange={onDropdownVisibleChange}
          >
            <widgets.PlainLinkButton className="icon-link-btn__dropdown no-line-height">
              <Icon icon={TriangleBottomIcon} />
            </widgets.PlainLinkButton>
          </Dropdown>
        </div>
      </div>
    );
  } else if (menu) {
    // A drop-down button
    return (
      <Dropdown
        trigger={["click"]}
        overlay={menu}
        visible={showingDropdown}
        onVisibleChange={onDropdownVisibleChange}
      >
        {wrapTooltip(
          <widgets.PlainLinkButton
            {...plainButtonProps}
            className={outerClassName}
          >
            {buttonContent}
            <div
              className="icon-link-btn__dropdown no-line-height"
              onClick={(e) => props.onClick && swallowClick(e)}
            >
              <Icon icon={TriangleBottomIcon} />
            </div>
          </widgets.PlainLinkButton>
        )}
      </Dropdown>
    );
  } else {
    // Just a normal click button
    return wrapTooltip(
      <widgets.PlainLinkButton {...plainButtonProps} className={outerClassName}>
        {buttonContent}
      </widgets.PlainLinkButton>
    );
  }
}
