// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BroadcastsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BroadcastsvgIcon(props: BroadcastsvgIconProps) {
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
          "M6.873 15.127a7.25 7.25 0 010-10.253m10.254 0a7.25 7.25 0 010 10.253m-2.122-8.132a4.25 4.25 0 010 6.01m-6.01 0a4.25 4.25 0 010-6.01"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M12.5 10a.5.5 0 11-1 0 .5.5 0 011 0z"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M12 13.75v5.5"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BroadcastsvgIcon;
/* prettier-ignore-end */
