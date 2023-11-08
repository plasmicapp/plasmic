// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type TrendingDownsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TrendingDownsvgIcon(props: TrendingDownsvgIconProps) {
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
          "M19.25 10.25l-5.5-5.5m4 14.5h.5a1 1 0 001-1v-2.5a1 1 0 00-1-1h-.5a1 1 0 00-1 1v2.5a1 1 0 001 1zm-6 0h.5a1 1 0 001-1v-5.5a1 1 0 00-1-1h-.5a1 1 0 00-1 1v5.5a1 1 0 001 1zm-6 0h.5a1 1 0 001-1V5.75a1 1 0 00-1-1h-.5a1 1 0 00-1 1v12.5a1 1 0 001 1zm13.5-12.5v3.5h-3.5"
        }
      ></path>
    </svg>
  );
}

export default TrendingDownsvgIcon;
/* prettier-ignore-end */
