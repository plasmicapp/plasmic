// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type GitDiffsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GitDiffsvgIcon(props: GitDiffsvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        stroke: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M9.25 7a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm10 10a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM6.75 9.5v3.512a4 4 0 00.699 2.26L10 19m7.25-4.75v-3.78a3 3 0 00-.568-1.756L14 5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M10.25 15.75v3.5h-3.5m7-11v-3.5h3.5"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GitDiffsvgIcon;
/* prettier-ignore-end */
