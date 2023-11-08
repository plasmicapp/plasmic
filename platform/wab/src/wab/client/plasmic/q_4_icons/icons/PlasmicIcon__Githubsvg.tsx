// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type GithubsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GithubsvgIcon(props: GithubsvgIconProps) {
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
          "M4.75 12c0-1.219.3-2.368.832-3.376l-.78-2.57c-.262-.862.66-1.604 1.446-1.162l1.815 1.02A7.216 7.216 0 0112 4.75c1.453 0 2.805.427 3.94 1.163l1.822-1.022c.787-.44 1.71.303 1.445 1.165l-.787 2.572A7.25 7.25 0 114.75 12z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GithubsvgIcon;
/* prettier-ignore-end */
