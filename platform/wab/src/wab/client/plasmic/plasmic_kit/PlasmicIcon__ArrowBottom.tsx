/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ArrowBottomIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowBottomIcon(props: ArrowBottomIconProps) {
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
          "M17.707 13.707a1 1 0 00-1.414-1.414L13 15.586V5h-2v10.586l-3.293-3.293a1 1 0 00-1.414 1.414L12 19.414l5.707-5.707z"
        }
      ></path>
    </svg>
  );
}

export default ArrowBottomIcon;
/* prettier-ignore-end */
