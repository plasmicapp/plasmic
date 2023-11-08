// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Briefcase2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Briefcase2SvgIcon(props: Briefcase2SvgIconProps) {
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
          "M4.75 9.75a2 2 0 012-2h10.5a2 2 0 012 2v7.5a2 2 0 01-2 2H6.75a2 2 0 01-2-2v-7.5z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M8.75 18.75v-12a2 2 0 012-2h2.5a2 2 0 012 2v12"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default Briefcase2SvgIcon;
/* prettier-ignore-end */
