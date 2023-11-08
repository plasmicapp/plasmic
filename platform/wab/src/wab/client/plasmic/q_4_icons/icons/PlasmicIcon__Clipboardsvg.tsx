// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ClipboardsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ClipboardsvgIcon(props: ClipboardsvgIconProps) {
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
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M9 6.75H7.75a2 2 0 00-2 2v8.5a2 2 0 002 2h8.5a2 2 0 002-2v-8.5a2 2 0 00-2-2H15"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M14 8.25h-4a1 1 0 01-1-1v-1.5a1 1 0 011-1h4a1 1 0 011 1v1.5a1 1 0 01-1 1zm-4.25 4h4.5m-4.5 3h4.5"
        }
      ></path>
    </svg>
  );
}

export default ClipboardsvgIcon;
/* prettier-ignore-end */
