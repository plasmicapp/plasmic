// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type GiftsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GiftsvgIcon(props: GiftsvgIconProps) {
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
          "M5.75 11.25h12.5v6a2 2 0 01-2 2h-8.5a2 2 0 01-2-2v-6zm-1-3.5h14.5v3.5H4.75v-3.5zM12 19v-7.5m.5-4l2.75-2.75M11.5 7.5L8.75 4.75"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GiftsvgIcon;
/* prettier-ignore-end */
