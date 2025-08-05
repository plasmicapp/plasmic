/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type AlertSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AlertSvgIcon(props: AlertSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M12 14.25a.75.75 0 000 1.5v-1.5zm.01 1.5a.75.75 0 000-1.5v1.5zm-.01 0h.01v-1.5H12v1.5zM10.403 5.411l.53.53-.53-.53zm-4.992 4.992l-.53-.53.53.53zm0 3.194l.53-.53-.53.53zm4.992 4.992l.53-.53-.53.53zm3.194 0l.53.53-.53-.53zm4.992-8.186l.53-.53-.53.53zm-4.992-4.992l.53-.53-.53.53zm-3.724-.53L4.881 9.873l1.06 1.06 4.993-4.991L9.873 4.88zm-4.992 9.246l4.992 4.992 1.06-1.06-4.991-4.993-1.061 1.061zm9.246 4.992l4.992-4.992-1.06-1.06-4.993 4.991 1.061 1.061zm4.992-9.246l-4.992-4.992-1.06 1.06 4.991 4.993 1.061-1.061zm0 4.254a3.008 3.008 0 000-4.254l-1.06 1.06a1.508 1.508 0 010 2.133l1.06 1.061zm-9.246 4.992a3.008 3.008 0 004.254 0l-1.06-1.06a1.508 1.508 0 01-2.133 0l-1.061 1.06zM4.881 9.873a3.008 3.008 0 000 4.254l1.06-1.06a1.508 1.508 0 010-2.133l-1.06-1.061zm6.053-3.931a1.508 1.508 0 012.132 0l1.061-1.061a3.008 3.008 0 00-4.254 0l1.06 1.06z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={"M12 8.75v3.5"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default AlertSvgIcon;
/* prettier-ignore-end */
