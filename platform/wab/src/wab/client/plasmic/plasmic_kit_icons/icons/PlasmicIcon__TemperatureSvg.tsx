/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type TemperatureSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TemperatureSvgIcon(props: TemperatureSvgIconProps) {
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
          "M10.75 4.75a2 2 0 00-2 2v4.644a4.25 4.25 0 104.5 0V6.75a2 2 0 00-2-2h-.5zm6.5 0h-.5m.5 3h-.5m.5 3h-.5M11 15.25V13"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default TemperatureSvgIcon;
/* prettier-ignore-end */
