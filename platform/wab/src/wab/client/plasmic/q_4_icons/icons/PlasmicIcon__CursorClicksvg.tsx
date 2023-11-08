// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type CursorClicksvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CursorClicksvgIcon(props: CursorClicksvgIconProps) {
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
          "M8.75 8.75L13 19.25l1.25-5 5-1.25-10.5-4.25zM15 15l4.25 4.25M4.75 4.75l1.5 1.5m7-1.5l-1.5 1.5m6 11.5l1.5 1.5m-13-7.5l-1.5 1.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default CursorClicksvgIcon;
/* prettier-ignore-end */
