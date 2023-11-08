// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SharesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SharesvgIcon(props: SharesvgIconProps) {
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
          "M9.25 4.75h-2.5a2 2 0 00-2 2v10.5a2 2 0 002 2h10.5a2 2 0 002-2v-2.5m0-5.5v-4.5h-4.5M19 5l-7.25 7.25"
        }
      ></path>
    </svg>
  );
}

export default SharesvgIcon;
/* prettier-ignore-end */
