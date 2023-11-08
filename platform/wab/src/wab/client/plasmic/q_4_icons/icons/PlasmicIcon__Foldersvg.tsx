// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FoldersvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FoldersvgIcon(props: FoldersvgIconProps) {
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
          "M19.25 17.25v-7.5a2 2 0 00-2-2H4.75v9.5a2 2 0 002 2h10.5a2 2 0 002-2z"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M13.5 7.5l-.931-1.708a2 2 0 00-1.756-1.042H6.75a2 2 0 00-2 2V11"}
      ></path>
    </svg>
  );
}

export default FoldersvgIcon;
/* prettier-ignore-end */
