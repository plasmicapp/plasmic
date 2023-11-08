// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type GbpsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GbpsvgIcon(props: GbpsvgIconProps) {
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
          "M17.25 8.25v-1.5a2 2 0 00-2-2h-3.5c-1.105 0-2 .893-2 1.998V14c0 3-3 5.25-3 5.25h8.5a2 2 0 002-2v-.5m-10.5-5h6.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GbpsvgIcon;
/* prettier-ignore-end */
