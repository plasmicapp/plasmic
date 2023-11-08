// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type LogOutsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LogOutsvgIcon(props: LogOutsvgIconProps) {
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
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M15.75 8.75l3.5 3.25-3.5 3.25M19 12h-8.25m4.5-7.25h-8.5a2 2 0 00-2 2v10.5a2 2 0 002 2h8.5"
        }
      ></path>
    </svg>
  );
}

export default LogOutsvgIcon;
/* prettier-ignore-end */
