// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ProjectorsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ProjectorsvgIcon(props: ProjectorsvgIconProps) {
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
          "M18.25 7.75H5.75v7.5a2 2 0 002 2h8.5a2 2 0 002-2v-7.5zm0-3H5.75a1 1 0 00-1 1v1a1 1 0 001 1h12.5a1 1 0 001-1v-1a1 1 0 00-1-1zM12 17.5v1.75"
        }
      ></path>
    </svg>
  );
}

export default ProjectorsvgIcon;
/* prettier-ignore-end */
