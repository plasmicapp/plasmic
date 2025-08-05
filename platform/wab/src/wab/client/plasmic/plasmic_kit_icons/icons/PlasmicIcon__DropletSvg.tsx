/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type DropletSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DropletSvgIcon(props: DropletSvgIconProps) {
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
          "M17.25 14.071c0 2.86-2.35 5.179-5.25 5.179s-5.25-2.319-5.25-5.179C6.75 11.211 12 4.75 12 4.75s5.25 6.461 5.25 9.321z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default DropletSvgIcon;
/* prettier-ignore-end */
