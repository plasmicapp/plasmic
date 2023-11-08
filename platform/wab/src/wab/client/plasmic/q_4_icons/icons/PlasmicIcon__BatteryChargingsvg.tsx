// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BatteryChargingsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BatteryChargingsvgIcon(props: BatteryChargingsvgIconProps) {
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
          "M8.25 6.75h-1.5a2 2 0 00-2 2v6.5a2 2 0 002 2h.5m7.5-10.5h.5a2 2 0 012 2v6.5a2 2 0 01-2 2h-1.5m4-6.5H18c.69 0 1.25.56 1.25 1.25v0c0 .69-.56 1.25-1.25 1.25h-.25m-6-6.5l-3 5.25h4.5l-3 5.25"
        }
      ></path>
    </svg>
  );
}

export default BatteryChargingsvgIcon;
/* prettier-ignore-end */
