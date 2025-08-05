/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CrosshairSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CrosshairSvgIcon(props: CrosshairSvgIconProps) {
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
          "M18.25 12a6.25 6.25 0 11-12.5 0 6.25 6.25 0 0112.5 0zM12 4.75v4.5M19.25 12h-4.5M12 14.75v4.5M9.25 12h-4.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default CrosshairSvgIcon;
/* prettier-ignore-end */
