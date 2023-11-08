// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type MagnetsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MagnetsvgIcon(props: MagnetsvgIconProps) {
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
          "M4.75 5.75a1 1 0 011-1h2.5a1 1 0 011 1v6.5a2.75 2.75 0 105.5 0v-6.5a1 1 0 011-1h2.5a1 1 0 011 1V12a7.25 7.25 0 11-14.5 0V5.75zm.25 3h4m6 0h4"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default MagnetsvgIcon;
/* prettier-ignore-end */
