// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Mug2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Mug2SvgIcon(props: Mug2SvgIconProps) {
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
          "M7.25 8.75h-.5a2 2 0 00-2 2v2.5a2 2 0 002 2h.5m12-9.5H7.75v10.5a2 2 0 002 2h7.5a2 2 0 002-2V5.75z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default Mug2SvgIcon;
/* prettier-ignore-end */
