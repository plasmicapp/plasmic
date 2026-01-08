/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type Icon3IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon3Icon(props: Icon3IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 32 32"}
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
          "M30.974 20.103C30.51 12.236 23.984 6 16 6 8.017 6 1.49 12.236 1.026 20.103c.027.339.082.589.192.805a2 2 0 00.874.874c.402.205.92.217 1.908.218v-1C4 14.373 9.373 9 16 9s12 5.373 12 12v1c.988 0 1.506-.013 1.908-.218a2 2 0 00.874-.874c.11-.216.165-.466.192-.805zM16 13a8 8 0 00-8 8v1H5v-1c0-6.075 4.925-11 11-11s11 4.925 11 11v1h-3v-1a8 8 0 00-8-8zm7 8v1h-2a1 1 0 01-1-1 4 4 0 00-8 0 1 1 0 01-1 1H9v-1a7 7 0 1114 0z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default Icon3Icon;
/* prettier-ignore-end */
