// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type AZSortsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AZSortsvgIcon(props: AZSortsvgIconProps) {
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
          "M4.75 10.25l.818-2m0 0L7 4.75l1.432 3.5m-2.864 0h2.864m0 0l.818 2m-4.5 4.5h4.5l-4.5 4.5h4.5m5.5-12L17 4.75m0 0l2.25 2.5M17 4.75v14.5m0 0l-2.25-2.5m2.25 2.5l2.25-2.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default AZSortsvgIcon;
/* prettier-ignore-end */
