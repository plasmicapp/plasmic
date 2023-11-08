// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type RainsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function RainsvgIcon(props: RainsvgIconProps) {
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
          "M4.75 12A3.25 3.25 0 008 15.25h8a3.25 3.25 0 00.243-6.491 4.25 4.25 0 00-8.486 0A3.25 3.25 0 004.75 12zm3 5.75l.5 1.5m3.5-1.5l.5 1.5m3.5-1.5l.5 1.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default RainsvgIcon;
/* prettier-ignore-end */
