// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FileMinus2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FileMinus2SvgIcon(props: FileMinus2SvgIconProps) {
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
          "M12.75 4.75h-5a2 2 0 00-2 2v10.5a2 2 0 002 2h4.5m.5-14.5v3.5a2 2 0 002 2h3.5m-5.5-5.5l5.5 5.5m0 0v3m1 4h-3.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default FileMinus2SvgIcon;
/* prettier-ignore-end */
