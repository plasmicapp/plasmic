// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FramePlusIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FramePlusIcon(props: FramePlusIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 20 20"}
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
          "M6.25 3.958a.625.625 0 00-1.25 0V5H3.958a.625.625 0 000 1.25H5v7.5H3.958a.625.625 0 100 1.25H5v1.042a.625.625 0 001.25 0V15h3.125a.625.625 0 100-1.25H6.25v-7.5h7.5v3.125a.625.625 0 101.25 0V6.25h1.042a.625.625 0 000-1.25H15V3.958a.625.625 0 10-1.25 0V5h-7.5V3.958zm7.917 7.709c.345 0 .625.28.625.625v1.25h1.25a.625.625 0 010 1.25h-1.25v1.25a.625.625 0 01-1.25 0v-1.25h-1.25a.625.625 0 010-1.25h1.25v-1.25c0-.345.28-.625.625-.625z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default FramePlusIcon;
/* prettier-ignore-end */
