// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type StrikethroughsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function StrikethroughsvgIcon(props: StrikethroughsvgIconProps) {
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
          "M4.75 12.25h14.5m-1-4V8a3 3 0 00-3-3h-6.5a3 3 0 00-3 3v1.25a3 3 0 003 3H15m-9.25 3.5v.5a3 3 0 003 3h6.5a3 3 0 003-3v-1.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default StrikethroughsvgIcon;
/* prettier-ignore-end */
