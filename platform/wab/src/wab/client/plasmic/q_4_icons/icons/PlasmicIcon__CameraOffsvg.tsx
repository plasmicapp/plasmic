// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type CameraOffsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CameraOffsvgIcon(props: CameraOffsvgIconProps) {
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
          "M7.5 7.75h-.75a2 2 0 00-2 2v7.5a2 2 0 002 2h10.086c.89 0 1.337-1.077.707-1.707L4.75 4.75m5 0h4.583a1 1 0 01.923.615l.738 1.77a1 1 0 00.923.615h.333a2 2 0 012 2v5.5M9.923 10.5a3.25 3.25 0 104.577 4.577"
        }
      ></path>
    </svg>
  );
}

export default CameraOffsvgIcon;
/* prettier-ignore-end */
