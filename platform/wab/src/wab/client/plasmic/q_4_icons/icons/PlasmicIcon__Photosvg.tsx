// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PhotosvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PhotosvgIcon(props: PhotosvgIconProps) {
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
          "M4.75 16l2.746-3.493a2 2 0 013.09-.067L13 15.25m-2.085-2.427a645.29 645.29 0 002.576-3.31 2 2 0 013.094-.073L19 12.25m-12.25 7h10.5a2 2 0 002-2V6.75a2 2 0 00-2-2H6.75a2 2 0 00-2 2v10.5a2 2 0 002 2z"
        }
      ></path>
    </svg>
  );
}

export default PhotosvgIcon;
/* prettier-ignore-end */
