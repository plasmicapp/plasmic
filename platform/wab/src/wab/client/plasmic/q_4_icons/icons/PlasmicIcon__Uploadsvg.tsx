// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type UploadsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function UploadsvgIcon(props: UploadsvgIconProps) {
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
          "M4.75 14.75v1.5a3 3 0 003 3h8.5a3 3 0 003-3v-1.5m-7.25-.5V5M8.75 8.25L12 4.75l3.25 3.5"
        }
      ></path>
    </svg>
  );
}

export default UploadsvgIcon;
/* prettier-ignore-end */
