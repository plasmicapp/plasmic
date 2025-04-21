/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type MoneySvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MoneySvgIcon(props: MoneySvgIconProps) {
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
          "M17.25 6.75H6.75a2 2 0 00-2 2v6.5a2 2 0 002 2h10.5a2 2 0 002-2v-6.5a2 2 0 00-2-2z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M14.25 12c0 1.795-1.007 3.25-2.25 3.25S9.75 13.795 9.75 12 10.757 8.75 12 8.75s2.25 1.455 2.25 3.25zm-9 2.25a2.5 2.5 0 012.5 2.5m11-2.5a2.5 2.5 0 00-2.5 2.5m-11-7a2.5 2.5 0 002.5-2.5m11 2.5a2.5 2.5 0 01-2.5-2.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default MoneySvgIcon;
/* prettier-ignore-end */
