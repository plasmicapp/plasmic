/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type EdgeHandleUpwardIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EdgeHandleUpwardIcon(props: EdgeHandleUpwardIconProps) {
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
          "M.5 2a.5.5 0 00.5.5h6a.5.5 0 00.5-.5A1.5 1.5 0 006 .5H2A1.5 1.5 0 00.5 2z"
        }
        fill={"#fff"}
        stroke={"currentColor"}
      ></path>
    </svg>
  );
}

export default EdgeHandleUpwardIcon;
/* prettier-ignore-end */
