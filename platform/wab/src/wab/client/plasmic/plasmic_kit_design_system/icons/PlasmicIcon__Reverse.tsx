/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ReverseIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ReverseIcon(props: ReverseIconProps) {
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
          "M20.394 39.806l-9.974-6.989a.996.996 0 010-1.638l9.974-6.989a1.027 1.027 0 011.623.82v4.981h29.989a2 2 0 010 4h-29.99v4.996a1.027 1.027 0 01-1.622.819z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default ReverseIcon;
/* prettier-ignore-end */
