// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BriefcasesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BriefcasesvgIcon(props: BriefcasesvgIconProps) {
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
          "M4.75 9.75a2 2 0 012-2h10.5a2 2 0 012 2v7.5a2 2 0 01-2 2H6.75a2 2 0 01-2-2v-7.5zm4-2.25v-.75a2 2 0 012-2h2.5a2 2 0 012 2v.75M5 13.25h14m-10.25-1.5v2.5m6.5-2.5v2.5"
        }
      ></path>
    </svg>
  );
}

export default BriefcasesvgIcon;
/* prettier-ignore-end */
