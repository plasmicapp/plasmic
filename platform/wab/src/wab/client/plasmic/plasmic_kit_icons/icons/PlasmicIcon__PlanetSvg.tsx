/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type PlanetSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PlanetSvgIcon(props: PlanetSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 25 24"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={"M17.45 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M14.7 13a.5.5 0 11-1 0 .5.5 0 011 0z"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M9.94 7.028C7.64 5.286 5.788 4.44 5.215 5.013c-.877.878 1.577 4.755 5.482 8.66 3.905 3.905 7.783 6.36 8.66 5.482.587-.587-.314-2.513-2.142-4.892"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PlanetSvgIcon;
/* prettier-ignore-end */
