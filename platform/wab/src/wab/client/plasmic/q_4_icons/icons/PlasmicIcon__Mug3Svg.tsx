// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Mug3SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Mug3SvgIcon(props: Mug3SvgIconProps) {
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
          "M19.25 17.25v-8.5H7.75v8.5a2 2 0 002 2h7.5a2 2 0 002-2zM7.5 10.75h-.75a2 2 0 00-2 2v1.5a2 2 0 002 2h.75m5.75-11.5v1.5m-5-1.5s1 0 1 1.5m9-1.5s-1 0-1 1.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default Mug3SvgIcon;
/* prettier-ignore-end */
