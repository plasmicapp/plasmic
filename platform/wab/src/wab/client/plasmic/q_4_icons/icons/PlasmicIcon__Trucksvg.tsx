// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type TrucksvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TrucksvgIcon(props: TrucksvgIconProps) {
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
          "M15.25 15.25H4.75V4.75h10.5v10.5zm-6 2.25a1.75 1.75 0 11-3.5 0 1.75 1.75 0 013.5 0zm9 0a1.75 1.75 0 11-3.5 0 1.75 1.75 0 013.5 0zm1-2.25h-4v-6.5h1a3 3 0 013 3v3.5z"
        }
      ></path>
    </svg>
  );
}

export default TrucksvgIcon;
/* prettier-ignore-end */
