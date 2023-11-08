// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ChevronRightIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ChevronRightIcon(props: ChevronRightIconProps) {
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
          "M8.793 6.293a1 1 0 011.414 0L15.914 12l-5.707 5.707a1 1 0 01-1.414-1.414L13.086 12 8.793 7.707a1 1 0 010-1.414z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default ChevronRightIcon;
/* prettier-ignore-end */
