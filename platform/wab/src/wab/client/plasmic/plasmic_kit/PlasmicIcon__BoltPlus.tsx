/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type BoltPlusIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BoltPlusIcon(props: BoltPlusIconProps) {
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
          "M47.816 28.175a2 2 0 01-.143 1.911A16.19 16.19 0 0046 30c-8.837 0-16 7.163-16 16 0 1.281.15 2.527.435 3.721l-4.923 5.6a1.999 1.999 0 01-3.376-2.013l6.004-16.309H18.016a2 2 0 01-1.5-3.32l21.984-25a1.999 1.999 0 013.376 2.012L35.87 26.999h10.124c.786 0 1.499.46 1.821 1.176zM46 36a2 2 0 012 2v6h6a2 2 0 010 4h-6v6a2 2 0 01-4 0v-6h-6a2 2 0 110-4h6v-6a2 2 0 012-2z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default BoltPlusIcon;
/* prettier-ignore-end */
