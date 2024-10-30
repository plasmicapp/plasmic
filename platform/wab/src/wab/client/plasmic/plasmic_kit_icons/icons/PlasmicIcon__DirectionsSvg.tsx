// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type DirectionsSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DirectionsSvgIcon(props: DirectionsSvgIconProps) {
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
          "M11.75 19.25V4.75m2.5 14.5h-4.5M12 4.75h6L19.25 6 18 7.25h-6m0 4.5h6L19.25 13 18 14.25h-6m-.25-3H6.207L4.75 10l1.457-1.25h5.543"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default DirectionsSvgIcon;
/* prettier-ignore-end */
