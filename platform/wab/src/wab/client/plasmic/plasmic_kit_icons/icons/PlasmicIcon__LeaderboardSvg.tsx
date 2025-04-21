/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type LeaderboardSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LeaderboardSvgIcon(props: LeaderboardSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        stroke: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M6.25 8.75h-.5a1 1 0 00-1 1v5.5a1 1 0 001 1h.5a1 1 0 001-1v-5.5a1 1 0 00-1-1zm6-4h-.5a1 1 0 00-1 1v9.5a1 1 0 001 1h.5a1 1 0 001-1v-9.5a1 1 0 00-1-1zm-7.5 14.5h14.5m-1-10.5h-.5a1 1 0 00-1 1v5.5a1 1 0 001 1h.5a1 1 0 001-1v-5.5a1 1 0 00-1-1z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default LeaderboardSvgIcon;
/* prettier-ignore-end */
