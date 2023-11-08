// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FlagPriority2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FlagPriority2SvgIcon(props: FlagPriority2SvgIconProps) {
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
          "M4.75 5.75v13.5m0-4v-9.5s1.25-1 4.25-1 4.5 1.5 7 1.5 3.25-.5 3.25-.5l-3.5 4.75 3.5 4.75s-.75 1-3.25 1-4.5-2-7-2-4.25 1-4.25 1z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default FlagPriority2SvgIcon;
/* prettier-ignore-end */
