/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type GitBranchSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GitBranchSvgIcon(props: GitBranchSvgIconProps) {
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
          "M9.25 7a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-2.5 2.5v5m4-2.25h4.5a2 2 0 002-2V9.5m2-2.5a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-10 10a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GitBranchSvgIcon;
/* prettier-ignore-end */
