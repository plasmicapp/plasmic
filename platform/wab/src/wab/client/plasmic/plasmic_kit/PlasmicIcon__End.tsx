/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type EndIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EndIcon(props: EndIconProps) {
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
        fill={"currentColor"}
        d={
          "M11 12.586V4h2v8.586l3.293-3.293a1 1 0 111.414 1.414L12 16.414l-5.707-5.707a1 1 0 011.414-1.414L11 12.586zM6 16H4v4h16v-4h-2v2H6v-2z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default EndIcon;
/* prettier-ignore-end */
