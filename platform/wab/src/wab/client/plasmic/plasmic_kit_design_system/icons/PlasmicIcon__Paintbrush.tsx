/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type PaintbrushIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PaintbrushIcon(props: PaintbrushIconProps) {
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
          "M52 10c1.005.21 1.79.995 2 2 0 1.668-14.64 19.64-18.5 23.5-2.503 2.503-5.908 4.5-7.75 4.5-.817 0-3.75-2.998-3.75-3.75 0-1.842 1.997-5.247 4.5-7.75C32.361 24.64 50.333 10 52 10zM9 49c0-.876 1.055-.233 2.667-1.843 1.352-1.351.844-4.51 3.67-7.333a6.225 6.225 0 118.805 8.8A11.334 11.334 0 0116 52c-3.579 0-7-2.124-7-3z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default PaintbrushIcon;
/* prettier-ignore-end */
