import { isWithinKeyboardInteractiveElement } from "@/wab/client/dom-utils";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { cx } from "@/wab/shared/common";
import * as React from "react";

interface DevContainerProps {
  showControls?: boolean;
  viewCtx?: ViewCtx;
  defaultHidden?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}
export class DevContainer extends React.Component<DevContainerProps, {}> {
  render() {
    return (
      <div
        onContextMenu={(e) => {
          // Disable context menu within Studio for most elements except
          // keyboard interactive elements, where it's nice to have options
          // like copy/paste functionality.
          if (!isWithinKeyboardInteractiveElement(e.target as Element)) {
            e.preventDefault();
          }
        }}
        className={cx(this.props.className, {
          "dev-env": true,
          invisible:
            this.props.showControls === undefined
              ? this.props.defaultHidden
              : !this.props.showControls,
        })}
        style={this.props.style}
        onMouseEnter={this.props.onMouseEnter}
        onMouseLeave={this.props.onMouseLeave}
      >
        {this.props.children}
      </div>
    );
  }
}
