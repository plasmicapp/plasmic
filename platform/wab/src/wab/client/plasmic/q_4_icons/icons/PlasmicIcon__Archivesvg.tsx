// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ArchivesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArchivesvgIcon(props: ArchivesvgIconProps) {
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
          "M18.25 8.75H5.75l.828 8.69a2 2 0 001.99 1.81h6.863a2 2 0 001.991-1.81l.828-8.69z"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M19.25 5.75a1 1 0 00-1-1H5.75a1 1 0 00-1 1v2a1 1 0 001 1h12.5a1 1 0 001-1v-2zm-9.5 7.5h4.5"
        }
      ></path>
    </svg>
  );
}

export default ArchivesvgIcon;
/* prettier-ignore-end */
