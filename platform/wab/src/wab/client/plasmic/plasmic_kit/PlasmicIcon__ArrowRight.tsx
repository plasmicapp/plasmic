/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ArrowRightIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowRightIcon(props: ArrowRightIconProps) {
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
          "M14.207 6.293a1 1 0 10-1.414 1.414L16.086 11H5.5v2h10.586l-3.293 3.293a1 1 0 001.414 1.414L19.914 12l-5.707-5.707z"
        }
      ></path>
    </svg>
  );
}

export default ArrowRightIcon;
/* prettier-ignore-end */
