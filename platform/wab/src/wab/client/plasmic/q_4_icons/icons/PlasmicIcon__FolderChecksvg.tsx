// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FolderChecksvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FolderChecksvgIcon(props: FolderChecksvgIconProps) {
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
        d={"M10.25 19.25h-3.5a2 2 0 01-2-2v-9.5h12.5a2 2 0 012 2v1.5"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M13.5 7.5l-.931-1.708a2 2 0 00-1.756-1.042H6.75a2 2 0 00-2 2V11m10 6.75l1.75 1.5 2.75-3.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default FolderChecksvgIcon;
/* prettier-ignore-end */
