// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type RewindsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function RewindsvgIcon(props: RewindsvgIconProps) {
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
        d={"M16 15.86l3.25 2.39V5.75L16 8.14M4.75 12l8.5-6.25v12.5L4.75 12z"}
      ></path>
    </svg>
  );
}

export default RewindsvgIcon;
/* prettier-ignore-end */
