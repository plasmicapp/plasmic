// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SearchsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SearchsvgIcon(props: SearchsvgIconProps) {
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
          "M19.25 19.25L15.5 15.5M4.75 11a6.25 6.25 0 1112.5 0 6.25 6.25 0 01-12.5 0z"
        }
      ></path>
    </svg>
  );
}

export default SearchsvgIcon;
/* prettier-ignore-end */
