/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ArrowTopLeftIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowTopLeftIcon(props: ArrowTopLeftIconProps) {
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
          "M6.404 14.475a1 1 0 102 0V9.818l7.485 7.485 1.414-1.414-7.485-7.485h4.657a1 1 0 100-2H6.404v8.07z"
        }
      ></path>
    </svg>
  );
}

export default ArrowTopLeftIcon;
/* prettier-ignore-end */
