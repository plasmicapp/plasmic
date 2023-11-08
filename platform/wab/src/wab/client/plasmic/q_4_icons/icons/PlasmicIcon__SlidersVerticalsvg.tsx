// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SlidersVerticalsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SlidersVerticalsvgIcon(props: SlidersVerticalsvgIconProps) {
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
          "M18.25 4.75v6.5m-12.5-6.5v6.5M12 4.75v2.5M18.25 15v4.25M5.75 15v4.25M12 11v8.25m7.25-4.5h-2.5m-9.5 0h-2.5m8.5-4h-2.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SlidersVerticalsvgIcon;
/* prettier-ignore-end */
