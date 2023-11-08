// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BasesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BasesvgIcon(props: BasesvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 25 24"}
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
          "M19.86 13.22l-6.405 6.4a1.726 1.726 0 01-2.44 0l-6.405-6.4a1.723 1.723 0 010-2.44l6.405-6.4a1.726 1.726 0 012.44 0l6.406 6.4a1.723 1.723 0 010 2.44z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BasesvgIcon;
/* prettier-ignore-end */
