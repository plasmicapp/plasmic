/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SearchFieldSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SearchFieldSvgIcon(props: SearchFieldSvgIconProps) {
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
          "M14 18a4 4 0 004-4h-1.5a2.5 2.5 0 01-2.5 2.5V18zm0-6.5a2.5 2.5 0 012.5 2.5H18a4 4 0 00-4-4v1.5zm0-1.5a4 4 0 00-4 4h1.5a2.5 2.5 0 012.5-2.5V10zm0 6.5a2.5 2.5 0 01-2.5-2.5H10a4 4 0 004 4v-1.5z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M16.5 16.5l2.75 2.75m-12-7h-.5a2 2 0 01-2-2v-3.5a2 2 0 012-2h10.5a2 2 0 012 2v2.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SearchFieldSvgIcon;
/* prettier-ignore-end */
