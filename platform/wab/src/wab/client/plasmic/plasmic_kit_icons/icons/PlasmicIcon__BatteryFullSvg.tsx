/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type BatteryFullSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BatteryFullSvgIcon(props: BatteryFullSvgIconProps) {
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
          "M4.75 8.75a2 2 0 012-2h8.5a2 2 0 012 2v6.5a2 2 0 01-2 2h-8.5a2 2 0 01-2-2v-6.5zm3 1v4.5M11 9.75v4.5m3.25-4.5v4.5m3.5-3.5H18c.69 0 1.25.56 1.25 1.25v0c0 .69-.56 1.25-1.25 1.25h-.25"
        }
      ></path>
    </svg>
  );
}

export default BatteryFullSvgIcon;
/* prettier-ignore-end */
