/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type WrapIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WrapIcon(props: WrapIconProps) {
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
        d={
          "M27.377 33.504c.83-.83.83-2.176 0-3.006l-9.912-9.911a2 2 0 10-2.828 2.828l6.585 6.586H6.051v4h15.171l-6.585 6.586a2 2 0 102.828 2.828l9.912-9.911zm9.246 0a2.125 2.125 0 010-3.006l9.912-9.911a2 2 0 112.828 2.828l-6.585 6.586h15.171v4H42.778l6.585 6.586a2 2 0 01-2.828 2.828l-9.912-9.911z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default WrapIcon;
/* prettier-ignore-end */
