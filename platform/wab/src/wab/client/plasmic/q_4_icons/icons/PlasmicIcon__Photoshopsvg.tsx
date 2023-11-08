// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PhotoshopsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PhotoshopsvgIcon(props: PhotoshopsvgIconProps) {
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
          "M4.75 7.75a3 3 0 013-3h8.5a3 3 0 013 3v8.5a3 3 0 01-3 3h-8.5a3 3 0 01-3-3v-8.5z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M12.755 16.25h1.593a.9.9 0 00.85-1.194c-.075-.215-.3-.321-.525-.36l-1.322-.223c-.224-.038-.447-.145-.532-.356-.248-.62.194-1.367.933-1.367h1.502m-7.504 3.5v-4m0 0v-3.5H9.5a1.75 1.75 0 110 3.5H7.75z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PhotoshopsvgIcon;
/* prettier-ignore-end */
