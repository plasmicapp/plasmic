// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Dogecoin2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Dogecoin2SvgIcon(props: Dogecoin2SvgIconProps) {
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
          "M8.75 5.75H11a6.25 6.25 0 110 12.5H8.75m0-12.5v12.5m0-12.5h-2m2 12.5h-2m0-6.25h5.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default Dogecoin2SvgIcon;
/* prettier-ignore-end */
