// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type LinkBreaksvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LinkBreaksvgIcon(props: LinkBreaksvgIconProps) {
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
          "M17.75 12.25L18 12a4.243 4.243 0 10-6-6l-.25.25m-5.5 5.5L6 12a4.243 4.243 0 106 6l.25-.25m-4-13v1.5m7.5 11.5v1.5m-9.5-11h-1.5m14.5 7.5h-1.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default LinkBreaksvgIcon;
/* prettier-ignore-end */
