// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type LinksvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LinksvgIcon(props: LinksvgIconProps) {
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
          "M16.75 13.25L18 12a4.243 4.243 0 000-6v0a4.243 4.243 0 00-6 0l-1.25 1.25m-3.5 3.5L6 12a4.243 4.243 0 000 6v0a4.243 4.243 0 006 0l1.25-1.25m1-7l-4.5 4.5"
        }
      ></path>
    </svg>
  );
}

export default LinksvgIcon;
/* prettier-ignore-end */
