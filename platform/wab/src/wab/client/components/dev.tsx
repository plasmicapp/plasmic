import * as React from "react";
import { cx } from "../../common";
import { $ } from "../../deps";
import { ViewCtx } from "../studio-ctx/view-ctx";

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
          "dev-env--hidden":
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
