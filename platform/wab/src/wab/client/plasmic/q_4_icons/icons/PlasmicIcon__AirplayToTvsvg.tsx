// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type AirplayToTvsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AirplayToTvsvgIcon(props: AirplayToTvsvgIconProps) {
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
          "M16.75 17.25h.5a2 2 0 002-2v-8.5a2 2 0 00-2-2H6.75a2 2 0 00-2 2v8.5a2 2 0 002 2h.5"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M12 15.75l-3 3.5h6l-3-3.5z"}
      ></path>
    </svg>
  );
}

export default AirplayToTvsvgIcon;
/* prettier-ignore-end */
