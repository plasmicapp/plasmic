// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SpacingHorizontalsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SpacingHorizontalsvgIcon(props: SpacingHorizontalsvgIconProps) {
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
          "M4.75 4.75h1.5a2 2 0 012 2v10.5a2 2 0 01-2 2h-1.5m14.5-14.5h-1.5a2 2 0 00-2 2v10.5a2 2 0 002 2h1.5M12 8.75v6.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SpacingHorizontalsvgIcon;
/* prettier-ignore-end */
