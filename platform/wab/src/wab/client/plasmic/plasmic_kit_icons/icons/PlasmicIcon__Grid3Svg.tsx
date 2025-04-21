/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type Grid3SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Grid3SvgIcon(props: Grid3SvgIconProps) {
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
          "M12 19.25h5.25a2 2 0 002-2V12M12 19.25H6.75a2 2 0 01-2-2V12M12 19.25V4.75m0 0H6.75a2 2 0 00-2 2V12M12 4.75h5.25a2 2 0 012 2V12m-14.5 0h14.5"
        }
      ></path>
    </svg>
  );
}

export default Grid3SvgIcon;
/* prettier-ignore-end */
