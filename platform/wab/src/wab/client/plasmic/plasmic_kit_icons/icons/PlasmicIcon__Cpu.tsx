/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CpuIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CpuIcon(props: CpuIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M6.75 8.75a2 2 0 012-2h6.5a2 2 0 012 2v6.5a2 2 0 01-2 2h-6.5a2 2 0 01-2-2v-6.5zm3-4v1.5m9.5 3.5h-1.5m-8 8v1.5m-3.5-9.5h-1.5m9.5-5v1.5m5 8h-1.5m-3.5 3.5v1.5m-8-5h-1.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default CpuIcon;
/* prettier-ignore-end */
