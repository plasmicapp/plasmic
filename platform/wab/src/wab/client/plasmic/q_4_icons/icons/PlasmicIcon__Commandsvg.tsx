// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type CommandsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CommandsvgIcon(props: CommandsvgIconProps) {
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
          "M4.75 6.5a1.75 1.75 0 113.5 0v1.75H6.5A1.75 1.75 0 014.75 6.5zm11 0a1.75 1.75 0 111.75 1.75h-1.75V6.5zm0 9.25h1.75a1.75 1.75 0 11-1.75 1.75v-1.75zm-11 1.75c0-.966.784-1.75 1.75-1.75h1.75v1.75a1.75 1.75 0 11-3.5 0zm3.5-9.25h7.5v7.5h-7.5v-7.5z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default CommandsvgIcon;
/* prettier-ignore-end */
