/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type BarcodeSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BarcodeSvgIcon(props: BarcodeSvgIconProps) {
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
          "M7.25 4.75h-.5a2 2 0 00-2 2v.5m12-2.5h.5a2 2 0 012 2v.5m-12 12h-.5a2 2 0 01-2-2v-.5m12 2.5h.5a2 2 0 002-2v-.5M7.75 9v6M12 9v6m4.25-6v6"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BarcodeSvgIcon;
/* prettier-ignore-end */
