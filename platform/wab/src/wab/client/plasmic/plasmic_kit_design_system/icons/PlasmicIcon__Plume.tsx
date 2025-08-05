/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type PlumeIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PlumeIcon(props: PlumeIconProps) {
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
          "M4.75 19.25l10.5-10.5m-6.564 8.5H6.75v-1.936a8 8 0 012.343-5.657l2.564-2.564a8 8 0 015.657-2.343h1.936v1.936a8 8 0 01-2.343 5.657l-2.564 2.564a8 8 0 01-5.657 2.343z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PlumeIcon;
/* prettier-ignore-end */
