// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type AnnotationWarningsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AnnotationWarningsvgIcon(props: AnnotationWarningsvgIconProps) {
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
          "M4.75 6.75a2 2 0 012-2h10.5a2 2 0 012 2v7.5a2 2 0 01-2 2h-2.625l-2.625 3-2.625-3H6.75a2 2 0 01-2-2v-7.5z"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"2"}
        d={"M12 8v2"}
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        d={"M12.5 13a.5.5 0 11-1 0 .5.5 0 011 0z"}
      ></path>
    </svg>
  );
}

export default AnnotationWarningsvgIcon;
/* prettier-ignore-end */
