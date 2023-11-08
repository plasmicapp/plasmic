// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type GitForksvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GitForksvgIcon(props: GitForksvgIconProps) {
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
          "M9.25 7a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm10 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-5 10a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-7.5-7.5v.75a2 2 0 002 2H12m5.25-2.75v.75a2 2 0 01-2 2H12m0 0v2.25"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GitForksvgIcon;
/* prettier-ignore-end */
