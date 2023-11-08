// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BuildingStoresvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BuildingStoresvgIcon(props: BuildingStoresvgIconProps) {
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
          "M6.75 19.25h10.5a2 2 0 002-2V8.183a2 2 0 00-.179-.827l-.538-1.184A2 2 0 0016.713 5H7.287a2 2 0 00-1.82 1.172L4.93 7.356a2 2 0 00-.18.827v9.067a2 2 0 002 2z"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M9.5 7.75c0 1.243-1 2.5-2.5 2.5s-2.25-1.257-2.25-2.5m14.5 0c0 1.243-.75 2.5-2.25 2.5s-2.5-1.257-2.5-2.5m0 0c0 1.243-1 2.5-2.5 2.5s-2.5-1.257-2.5-2.5m.25 8a2 2 0 012-2h.5a2 2 0 012 2v3.5h-4.5v-3.5z"
        }
      ></path>
    </svg>
  );
}

export default BuildingStoresvgIcon;
/* prettier-ignore-end */
