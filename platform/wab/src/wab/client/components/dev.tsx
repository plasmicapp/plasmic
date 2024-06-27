import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { cx } from "@/wab/shared/common";
import $ from "jquery";
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
          if ($(e.target).closest("input").length === 0) {
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
