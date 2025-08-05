/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type TaurusSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TaurusSvgIcon(props: TaurusSvgIconProps) {
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
          "M7.75 15a4.25 4.25 0 118.5 0 4.25 4.25 0 01-8.5 0zm-3-10.25c5.75 0 1.75 6 7.25 6m7.25-6c-5.75 0-1.75 6-7.25 6"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default TaurusSvgIcon;
/* prettier-ignore-end */
