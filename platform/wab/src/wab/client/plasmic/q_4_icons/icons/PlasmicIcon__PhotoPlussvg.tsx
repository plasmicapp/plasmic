// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PhotoPlussvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PhotoPlussvgIcon(props: PhotoPlussvgIconProps) {
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
          "M11.25 19.25h-4.5a2 2 0 01-2-2V16m0 0V6.75a2 2 0 012-2h10.5a2 2 0 012 2v5.5l-2.664-2.81a2 2 0 00-3.085.06l-.01.013c-.093.121-1.529 1.978-2.565 3.296M4.75 16l2.746-3.493a2 2 0 013.09-.067l.34.37m0 0l1.324 1.44m-1.324-1.44l-.011.013M17 14.75v4.5M19.25 17h-4.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PhotoPlussvgIcon;
/* prettier-ignore-end */
