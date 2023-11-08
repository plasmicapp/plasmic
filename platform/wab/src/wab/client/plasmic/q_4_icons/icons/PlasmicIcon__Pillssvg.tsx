// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PillssvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PillssvgIcon(props: PillssvgIconProps) {
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
          "M16.25 4.75v2.5h-8.5v-2.5h8.5zm-1 2.5v3l1.317 1.152a2 2 0 01.683 1.506v4.342a2 2 0 01-2 2H8.765a2 2 0 01-2-2v-4.347a2 2 0 01.677-1.5L8.75 10.25v-3h6.5z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M7 16.25h6.25v-3.5H7"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PillssvgIcon;
/* prettier-ignore-end */
