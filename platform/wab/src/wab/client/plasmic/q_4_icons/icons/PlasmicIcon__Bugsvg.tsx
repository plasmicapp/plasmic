// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BugsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BugsvgIcon(props: BugsvgIconProps) {
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
          "M7.75 13a4.25 4.25 0 018.5 0v2a4.25 4.25 0 01-8.5 0v-2zM12 9v10M8.75 6.383c0-.902.731-1.633 1.633-1.633h3.234c.902 0 1.633.731 1.633 1.633a1.867 1.867 0 01-1.867 1.867h-2.766A1.867 1.867 0 018.75 6.383zM7.5 14.75l-1.433.521a2 2 0 00-1.317 1.88v2.099"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M8 11L5.802 9.816a2 2 0 01-1.052-1.76V5.75m11.75 9l1.433.521a2 2 0 011.317 1.88v2.099M16 11l2.198-1.184a2 2 0 001.052-1.76V5.75"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BugsvgIcon;
/* prettier-ignore-end */
