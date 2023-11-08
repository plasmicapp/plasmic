// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FileMinussvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FileMinussvgIcon(props: FileMinussvgIconProps) {
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
          "M12.25 19.25h-4.5a2 2 0 01-2-2V6.75a2 2 0 012-2H14L18.25 9v4.25m1 4h-3.5"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M18 9.25h-4.25V5"}
      ></path>
    </svg>
  );
}

export default FileMinussvgIcon;
/* prettier-ignore-end */
