/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type BoxControlsIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BoxControlsIcon(props: BoxControlsIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"currentcolor"}
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
          "M3 7a4 4 0 014-4v2a2 2 0 00-2 2H3zm2 3H3v4h2v-4zm0 7H3a4 4 0 004 4v-2a2 2 0 01-2-2zm5 2v2h4v-2h-4zm7 0v2a4 4 0 004-4h-2a2 2 0 01-2 2zm2-5h2v-4h-2v4zm0-7h2a4 4 0 00-4-4v2a2 2 0 012 2zm-5-2V3h-4v2h4z"
        }
        fill={"currentColor"}
      ></path>

      <path
        fillRule={"evenodd"}
        clipRule={"evenodd"}
        d={
          "M9 9v6h6V9H9zM8 7a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V8a1 1 0 00-1-1H8z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default BoxControlsIcon;
/* prettier-ignore-end */
