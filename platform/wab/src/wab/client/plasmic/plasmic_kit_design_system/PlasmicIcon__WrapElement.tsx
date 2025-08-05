/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type WrapElementIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WrapElementIcon(props: WrapElementIconProps) {
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
          "M18.173 12.758A9.964 9.964 0 0122 12h5a2 2 0 100-4h-5a13.96 13.96 0 00-5.36 1.063 2 2 0 001.533 3.695zM37 8a2 2 0 100 4h5c1.36 0 2.651.27 3.827.758a2 2 0 001.533-3.695A13.964 13.964 0 0042 8h-5zM12.758 18.173a2 2 0 00-3.695-1.533A13.964 13.964 0 008 22v5a2 2 0 104 0v-5c0-1.36.27-2.651.758-3.827zm42.179-1.533a2 2 0 00-3.695 1.533A9.964 9.964 0 0152 22v5a2 2 0 104 0v-5a13.96 13.96 0 00-1.063-5.36zM12 37a2 2 0 10-4 0v5c0 1.895.377 3.706 1.063 5.36a2 2 0 003.695-1.533A9.964 9.964 0 0112 42v-5zm44 0a2 2 0 10-4 0v5c0 1.36-.27 2.651-.758 3.827a2 2 0 003.695 1.533A13.964 13.964 0 0056 42v-5zM18.173 51.242a2 2 0 00-1.533 3.695A13.964 13.964 0 0022 56h5a2 2 0 100-4h-5c-1.36 0-2.651-.27-3.827-.758zm29.187 3.695a2 2 0 00-1.533-3.695A9.964 9.964 0 0142 52h-5a2 2 0 100 4h5a13.96 13.96 0 005.36-1.063zM26 20a6 6 0 00-6 6v12a6 6 0 006 6h12a6 6 0 006-6V26a6 6 0 00-6-6H26z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default WrapElementIcon;
/* prettier-ignore-end */
