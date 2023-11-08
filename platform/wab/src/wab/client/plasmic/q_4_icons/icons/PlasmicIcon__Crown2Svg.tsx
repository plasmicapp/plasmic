// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Crown2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Crown2SvgIcon(props: Crown2SvgIconProps) {
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
          "M6.75 16.75l-2-10L9 9.25l3-4.5 3 4.5 4.25-2.5-2 10H6.75zm10.5 0H6.75a2 2 0 00-2 2v.5h14.5v-.5a2 2 0 00-2-2z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default Crown2SvgIcon;
/* prettier-ignore-end */
