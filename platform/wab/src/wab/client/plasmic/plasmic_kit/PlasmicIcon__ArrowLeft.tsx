/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ArrowLeftIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowLeftIcon(props: ArrowLeftIconProps) {
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
          "M9.793 6.293a1 1 0 011.414 1.414L7.914 11H18.5v2H7.914l3.293 3.293a1 1 0 01-1.414 1.414L4.086 12l5.707-5.707z"
        }
      ></path>
    </svg>
  );
}

export default ArrowLeftIcon;
/* prettier-ignore-end */
