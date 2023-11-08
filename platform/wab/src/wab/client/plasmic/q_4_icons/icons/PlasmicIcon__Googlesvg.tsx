// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type GooglesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GooglesvgIcon(props: GooglesvgIconProps) {
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
          "M11.999 16.25a4.252 4.252 0 004.063-3H12.75v-2.5h6.392a7.303 7.303 0 010 2.5 7.25 7.25 0 11-2.405-6.738l-2.131 2.131a4.25 4.25 0 10-2.607 7.607z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GooglesvgIcon;
/* prettier-ignore-end */
