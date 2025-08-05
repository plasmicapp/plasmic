/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type FolderPersonSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FolderPersonSvgIcon(props: FolderPersonSvgIconProps) {
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
          "M10.25 19.25h-3.5a2 2 0 01-2-2v-9.5h12.5a2 2 0 012 2v.5m-5.75-2.5l-.931-1.958a2 2 0 00-1.756-1.042H6.75a2 2 0 00-2 2V11m9 8.25s1.25-1.5 2.75-1.5 2.75 1.5 2.75 1.5m-2.75-4a1.75 1.75 0 100-3.5 1.75 1.75 0 000 3.5z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default FolderPersonSvgIcon;
/* prettier-ignore-end */
