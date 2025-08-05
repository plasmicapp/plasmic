/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type GitMergeSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GitMergeSvgIcon(props: GitMergeSvgIconProps) {
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
          "M9.25 7a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm.5 4.75h4.75M6.75 14.5v-5m12.5 2.5a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-10 5a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GitMergeSvgIcon;
/* prettier-ignore-end */
