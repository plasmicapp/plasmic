/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type FlagPrioritySvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FlagPrioritySvgIcon(props: FlagPrioritySvgIconProps) {
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
          "M4.75 5.75v13.5m14.5-4v-9.5s-.75.5-3.25.5-4-1.5-7-1.5-4.25 1-4.25 1v9.5s1.75-1 4.25-1 4.5 2 7 2 3.25-1 3.25-1z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default FlagPrioritySvgIcon;
/* prettier-ignore-end */
