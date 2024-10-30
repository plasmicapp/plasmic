// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type GripSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GripSvgIcon(props: GripSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        fill: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fillRule={"evenodd"}
        clipRule={"evenodd"}
        d={
          "M10.25 5.25a1.25 1.25 0 10-2.5 0 1.25 1.25 0 002.5 0zm0 6.75a1.25 1.25 0 10-2.5 0 1.25 1.25 0 002.5 0zM9 17.5A1.25 1.25 0 119 20a1.25 1.25 0 010-2.5zm7.25-12.25a1.25 1.25 0 10-2.5 0 1.25 1.25 0 002.5 0zm0 6.75a1.25 1.25 0 10-2.5 0 1.25 1.25 0 002.5 0zM15 17.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default GripSvgIcon;
/* prettier-ignore-end */
