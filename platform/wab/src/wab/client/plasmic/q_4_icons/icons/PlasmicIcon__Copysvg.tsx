// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type CopysvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CopysvgIcon(props: CopysvgIconProps) {
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
        d={
          "M6.5 15.25v0a1.75 1.75 0 01-1.75-1.75V6.75a2 2 0 012-2h6.75c.966 0 1.75.784 1.75 1.75v0"
        }
      ></path>

      <rect
        width={"10.5"}
        height={"10.5"}
        x={"8.75"}
        y={"8.75"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        rx={"2"}
      ></rect>
    </svg>
  );
}

export default CopysvgIcon;
/* prettier-ignore-end */
