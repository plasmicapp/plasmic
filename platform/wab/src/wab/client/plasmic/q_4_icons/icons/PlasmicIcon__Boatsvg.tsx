// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BoatsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BoatsvgIcon(props: BoatsvgIconProps) {
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
          "M4.75 17.75S7.5 20.93 12 18s7.25.25 7.25.25m-1.5-4l1.25-2.5H5l1.656 3.5m5.594-3.75V4.75L7 11.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BoatsvgIcon;
/* prettier-ignore-end */
