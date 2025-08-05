/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type StopSignIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function StopSignIcon(props: StopSignIconProps) {
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
          "M8.01 38.04V25.531c0-2.383.975-4.661 2.696-6.308l9.184-8.783a8.727 8.727 0 016.031-2.42h12.736c2.32 0 4.545.925 6.183 2.568l8.625 8.659a8.727 8.727 0 012.545 6.16v12.755a8.727 8.727 0 01-2.42 6.03l-8.73 9.132a8.727 8.727 0 01-6.308 2.696H26.026a8.728 8.728 0 01-6.16-2.545l-9.288-9.255a8.727 8.727 0 01-2.567-6.182zm13.586 1.554a2.002 2.002 0 002.83 2.831L32 34.852l7.584 7.584a2.002 2.002 0 002.83-2.83L34.83 32.02l7.613-7.613a2.001 2.001 0 00-2.83-2.83l-7.614 7.612-7.602-7.602a2.002 2.002 0 00-2.83 2.83l7.602 7.603-7.573 7.573z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default StopSignIcon;
/* prettier-ignore-end */
