// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FolderPlussvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FolderPlussvgIcon(props: FolderPlussvgIconProps) {
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
        d={"M12.25 19.25h-5.5a2 2 0 01-2-2v-9.5h12.5a2 2 0 012 2v2.5"}
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M13.5 7.5l-.931-1.708a2 2 0 00-1.756-1.042H6.75a2 2 0 00-2 2V11M17 14.75v4.5M19.25 17h-4.5"
        }
      ></path>
    </svg>
  );
}

export default FolderPlussvgIcon;
/* prettier-ignore-end */
