// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type RedditsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function RedditsvgIcon(props: RedditsvgIconProps) {
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
          "M19.25 13.5c0 3.176-3.246 5.75-7.25 5.75s-7.25-2.574-7.25-5.75S7.996 7.75 12 7.75s7.25 2.574 7.25 5.75zM12 7.5l2-2.75 2.5.75"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M14.5 12a.5.5 0 11-1 0 .5.5 0 011 0zm-4 0a.5.5 0 11-1 0 .5.5 0 011 0z"
        }
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M8.75 14.75s1.083 1.5 3.25 1.5 3.25-1.5 3.25-1.5m4-8.75a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zM7.786 8.313a1.75 1.75 0 10-2.493 2.454"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default RedditsvgIcon;
/* prettier-ignore-end */
