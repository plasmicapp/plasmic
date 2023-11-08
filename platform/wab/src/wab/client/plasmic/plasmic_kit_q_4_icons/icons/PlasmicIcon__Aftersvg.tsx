// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type AftersvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AftersvgIcon(props: AftersvgIconProps) {
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
          "M17.25 15.75H6.75a2 2 0 01-2-2v-7a2 2 0 012-2h10.5a2 2 0 012 2v7a2 2 0 01-2 2zm-9.5 3.5h8.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default AftersvgIcon;
/* prettier-ignore-end */
