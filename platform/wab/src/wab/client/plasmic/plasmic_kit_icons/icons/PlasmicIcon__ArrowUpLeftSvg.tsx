/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ArrowUpLeftSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowUpLeftSvgIcon(props: ArrowUpLeftSvgIconProps) {
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
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M6.75 15.25v-8.5h8.5M7 7l10.25 10.25"}
      ></path>
    </svg>
  );
}

export default ArrowUpLeftSvgIcon;
/* prettier-ignore-end */
