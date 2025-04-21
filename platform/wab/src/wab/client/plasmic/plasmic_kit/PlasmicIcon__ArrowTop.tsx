/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ArrowTopIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowTopIcon(props: ArrowTopIconProps) {
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
          "M6.293 9.793a1 1 0 001.414 1.414L11 7.914V18.5h2V7.914l3.293 3.293a1 1 0 001.414-1.414L12 4.086 6.293 9.793z"
        }
      ></path>
    </svg>
  );
}

export default ArrowTopIcon;
/* prettier-ignore-end */
