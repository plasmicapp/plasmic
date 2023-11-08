// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type CamerasvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CamerasvgIcon(props: CamerasvgIconProps) {
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
        strokeWidth={"1.5"}
        d={
          "M19.25 17.25v-7.5a2 2 0 00-2-2h-.333a1 1 0 01-.923-.615l-.738-1.77a1 1 0 00-.923-.615H9.667a1 1 0 00-.923.615l-.738 1.77a1 1 0 01-.923.615H6.75a2 2 0 00-2 2v7.5a2 2 0 002 2h10.5a2 2 0 002-2z"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeWidth={"1.5"}
        d={"M15.25 13a3.25 3.25 0 11-6.5 0 3.25 3.25 0 016.5 0z"}
      ></path>
    </svg>
  );
}

export default CamerasvgIcon;
/* prettier-ignore-end */
