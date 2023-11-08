// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type WindsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WindsvgIcon(props: WindsvgIconProps) {
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
          "M10.75 7.25h6.5a2 2 0 002-2v-.5m-7 7.5h-4.5m-.5-5h-2.5m5.5 9.5h-5.5m14.5-4.5h-3.5m-2 4.5h3.5a2 2 0 012 2v.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default WindsvgIcon;
/* prettier-ignore-end */
