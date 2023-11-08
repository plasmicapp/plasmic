// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PaintbucketsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PaintbucketsvgIcon(props: PaintbucketsvgIconProps) {
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
          "M19.25 7.75H4.75m1 0v9.5a2 2 0 002 2h8.5a2 2 0 002-2v-9.5H5.75zm6.5 4.5v-7.5"
        }
      ></path>
    </svg>
  );
}

export default PaintbucketsvgIcon;
/* prettier-ignore-end */
