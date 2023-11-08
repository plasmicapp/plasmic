// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type LanguagessvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LanguagessvgIcon(props: LanguagessvgIconProps) {
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
          "M6.75 4.75a2 2 0 00-2 2v7.5a2 2 0 002 2h4a1 1 0 011 1v2l3.155-2.555a2 2 0 011.259-.445h1.086a2 2 0 002-2v-7.5a2 2 0 00-2-2H6.75z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M9.75 13.25L12 7.75l2.25 5.5m-3.25-2h2"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default LanguagessvgIcon;
/* prettier-ignore-end */
