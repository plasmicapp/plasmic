// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SunrisesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SunrisesvgIcon(props: SunrisesvgIconProps) {
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
          "M9.25 16.25l-.687-.75a4.25 4.25 0 116.875 0l-.688.75m-10.01 0h14.51m-12.51 3h10.51M12 4.75v.5m3.625.471l-.25.433m2.904 2.221l-.433.25M19.25 12h-.5m-13.5 0h-.5m1.404-3.375l-.433-.25m2.904-2.221l-.25-.433"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SunrisesvgIcon;
/* prettier-ignore-end */
