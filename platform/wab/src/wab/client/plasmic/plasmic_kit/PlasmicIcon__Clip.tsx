/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ClipIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ClipIcon(props: ClipIconProps) {
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
          "M9.25 8a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm0 8a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM9 15l10.25-8.25M9 9l10.25 7.25"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ClipIcon;
/* prettier-ignore-end */
