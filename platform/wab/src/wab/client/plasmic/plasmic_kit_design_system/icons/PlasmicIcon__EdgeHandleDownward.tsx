/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type EdgeHandleDownwardIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EdgeHandleDownwardIcon(props: EdgeHandleDownwardIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 8 3"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M.5 1A1.5 1.5 0 002 2.5h4A1.5 1.5 0 007.5 1 .5.5 0 007 .5H1a.5.5 0 00-.5.5z"
        }
        fill={"#fff"}
        stroke={"currentColor"}
      ></path>
    </svg>
  );
}

export default EdgeHandleDownwardIcon;
/* prettier-ignore-end */
