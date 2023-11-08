// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type HammersvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function HammersvgIcon(props: HammersvgIconProps) {
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
          "M10.75 13.25v-3h-2.5v1a1 1 0 01-1 1h-1.5a1 1 0 01-1-1v-5.5a1 1 0 011-1h1.5a1 1 0 011 1v1H15s4.25 0 4.25 4.5c0 0-2.25-1-5-1v3m-3.5 0h3.5m-3.5 0v6m3.5-6v6"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default HammersvgIcon;
/* prettier-ignore-end */
