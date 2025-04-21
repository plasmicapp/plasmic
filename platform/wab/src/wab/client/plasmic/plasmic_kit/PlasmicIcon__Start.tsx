/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type StartIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function StartIcon(props: StartIconProps) {
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
          "M11 11.414V20h2v-8.586l3.293 3.293a1 1 0 001.414-1.414L12 7.586l-5.707 5.707a1 1 0 101.414 1.414L11 11.414zM6 8H4V4h16v4h-2V6H6v2z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default StartIcon;
/* prettier-ignore-end */
