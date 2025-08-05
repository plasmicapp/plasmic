/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type EdgeHandleRightwardIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EdgeHandleRightwardIcon(props: EdgeHandleRightwardIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 3 8"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M1 7.5A1.5 1.5 0 002.5 6V2A1.5 1.5 0 001 .5a.5.5 0 00-.5.5v6a.5.5 0 00.5.5z"
        }
        fill={"#fff"}
        stroke={"currentColor"}
      ></path>
    </svg>
  );
}

export default EdgeHandleRightwardIcon;
/* prettier-ignore-end */
