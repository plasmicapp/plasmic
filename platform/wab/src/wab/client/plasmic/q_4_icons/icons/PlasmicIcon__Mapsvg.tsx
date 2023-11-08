// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type MapsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MapsvgIcon(props: MapsvgIconProps) {
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
          "M4.75 6.75l4.5-2v12.5l-4.5 2V6.75zm10 0l4.5-2v12.5l-4.5 2V6.75zm0 0l-5.5-2v12.5l5.5 2V6.75z"
        }
      ></path>
    </svg>
  );
}

export default MapsvgIcon;
/* prettier-ignore-end */
