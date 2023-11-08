// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type LibrasvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LibrasvgIcon(props: LibrasvgIconProps) {
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
          "M9.25 13.25c-.892-.78-1.5-1.973-1.5-3.25a4.25 4.25 0 018.5 0c0 1.277-.608 2.47-1.5 3.25m-10 0h4.5m-4.5 5h14.5m-4.5-5h4.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default LibrasvgIcon;
/* prettier-ignore-end */
