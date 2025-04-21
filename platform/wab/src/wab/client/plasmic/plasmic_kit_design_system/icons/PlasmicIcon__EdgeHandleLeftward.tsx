/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type EdgeHandleLeftwardIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EdgeHandleLeftwardIcon(props: EdgeHandleLeftwardIconProps) {
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
          "M2 7.5a.5.5 0 00.5-.5V1A.5.5 0 002 .5 1.5 1.5 0 00.5 2v4A1.5 1.5 0 002 7.5z"
        }
        fill={"#fff"}
        stroke={"currentColor"}
      ></path>
    </svg>
  );
}

export default EdgeHandleLeftwardIcon;
/* prettier-ignore-end */
