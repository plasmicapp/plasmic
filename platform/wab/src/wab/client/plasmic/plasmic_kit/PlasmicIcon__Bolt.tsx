/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type BoltIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BoltIcon(props: BoltIconProps) {
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
          "M47.816 28.175a1.999 1.999 0 01-.32 2.145l-21.984 25a1.999 1.999 0 01-3.376-2.012l6.004-16.309H18.016a2 2 0 01-1.5-3.32l21.984-25a1.999 1.999 0 013.376 2.012L35.87 26.999h10.124c.786 0 1.499.46 1.821 1.176z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default BoltIcon;
/* prettier-ignore-end */
