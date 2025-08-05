/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SunSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SunSvgIcon(props: SunSvgIconProps) {
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

      <circle
        cx={"12"}
        cy={"12"}
        r={"3.25"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
      ></circle>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M12 2.75v1.5m5.25 2.5l-1.184 1.184M21.25 12h-1.5m-2.5 5.25l-1.184-1.184M12 19.75v1.5m-4.066-5.184L6.75 17.25M4.25 12h-1.5m5.184-4.066L6.75 6.75"
        }
      ></path>
    </svg>
  );
}

export default SunSvgIcon;
/* prettier-ignore-end */
