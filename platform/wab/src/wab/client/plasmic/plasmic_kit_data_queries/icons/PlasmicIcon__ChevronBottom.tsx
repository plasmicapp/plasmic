// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ChevronBottomIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ChevronBottomIcon(props: ChevronBottomIconProps) {
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
          "M17.707 8.793a1 1 0 010 1.414L12 15.914l-5.707-5.707a1 1 0 011.414-1.414L12 13.086l4.293-4.293a1 1 0 011.414 0z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default ChevronBottomIcon;
/* prettier-ignore-end */
