/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type StrikeIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function StrikeIcon(props: StrikeIconProps) {
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
          "M4.75 12.25h14.5m-1-4V8a3 3 0 00-3-3h-6.5a3 3 0 00-3 3v1.25a3 3 0 003 3H15m-9.25 3.5v.5a3 3 0 003 3h6.5a3 3 0 003-3v-1.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default StrikeIcon;
/* prettier-ignore-end */
