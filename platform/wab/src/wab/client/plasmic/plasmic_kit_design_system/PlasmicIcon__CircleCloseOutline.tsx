/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CircleCloseOutlineIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CircleCloseOutlineIcon(props: CircleCloseOutlineIconProps) {
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
          "M32.01 56.02c-13.255 0-24-10.745-24-24 0-13.254 10.745-24 24-24s24 10.746 24 24c0 13.255-10.745 24-24 24zm0-44c-11.046 0-20 8.955-20 20.001 0 11.046 8.955 20 20.001 20 11.046 0 20-8.955 20-20 0-11.047-8.954-20.001-20-20.001h-.001zm2.82 20l7.584 7.584a2.002 2.002 0 11-2.816 2.846l-.015-.015L32 34.851l-7.573 7.573a2.002 2.002 0 01-2.83-2.83l7.573-7.574-7.602-7.602a2.001 2.001 0 012.83-2.83L32 29.19l7.613-7.613a2.001 2.001 0 112.83 2.83L34.83 32.02z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default CircleCloseOutlineIcon;
/* prettier-ignore-end */
