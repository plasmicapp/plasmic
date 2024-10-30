// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type GitPullRequestSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GitPullRequestSvgIcon(props: GitPullRequestSvgIconProps) {
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
          "M9.25 7a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm0 10a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm10 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM6.75 9.5v4.75m10.5 0v-3.78a3 3 0 00-.568-1.756L14 5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M13.75 8.25v-3.5h3.5"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GitPullRequestSvgIcon;
/* prettier-ignore-end */
