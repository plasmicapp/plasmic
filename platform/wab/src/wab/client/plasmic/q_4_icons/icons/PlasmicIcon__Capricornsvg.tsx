// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type CapricornsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CapricornsvgIcon(props: CapricornsvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        stroke: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M4.75 4.75s3-.093 3 2.25v6m0-5.5c0-1.38.75-2.75 3.25-2.75s3.25 1.37 3.25 2.75v6.889m0 0V15l1.049 1.4a2.197 2.197 0 103.392-2.786l-.076-.085a2.33 2.33 0 00-3.352-.118l-1.013.978zm0 0l-2.838 2.739a4 4 0 01-2.778 1.122H7.75"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default CapricornsvgIcon;
/* prettier-ignore-end */
