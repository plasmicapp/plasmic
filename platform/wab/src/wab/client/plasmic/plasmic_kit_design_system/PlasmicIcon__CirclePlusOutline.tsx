/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CirclePlusOutlineIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CirclePlusOutlineIcon(props: CirclePlusOutlineIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 64 64"}
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
          "M32.01 56.02c-13.255 0-24-10.745-24-24 0-13.254 10.745-24 24-24s24 10.746 24 24c0 13.255-10.745 24-24 24zm0-44c-11.046 0-20 8.955-20 20 0 11.047 8.954 20.002 20 20.001 11.047 0 20.001-8.955 20.001-20 0-11.047-8.955-20.001-20-20.001h-.001zm2 33a2 2 0 01-4 0v-11h-11a2 2 0 110-4h11v-11a2 2 0 114 0v11h11a2 2 0 010 4h-11v11z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default CirclePlusOutlineIcon;
/* prettier-ignore-end */
