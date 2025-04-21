/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ArrowTopRightIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowTopRightIcon(props: ArrowTopRightIconProps) {
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
          "M17.596 14.475a1 1 0 11-2 0V9.818l-7.485 7.485-1.414-1.414 7.485-7.485H9.525a1 1 0 110-2h8.071v8.07z"
        }
      ></path>
    </svg>
  );
}

export default ArrowTopRightIcon;
/* prettier-ignore-end */
