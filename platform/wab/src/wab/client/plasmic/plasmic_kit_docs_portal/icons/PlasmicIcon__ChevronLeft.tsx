// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ChevronLeftIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ChevronLeftIcon(props: ChevronLeftIconProps) {
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
          "M15.207 6.293a1 1 0 00-1.414 0L8.086 12l5.707 5.707a1 1 0 001.414-1.414L10.914 12l4.293-4.293a1 1 0 000-1.414z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default ChevronLeftIcon;
/* prettier-ignore-end */
