/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ArrowBottomRightIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ArrowBottomRightIcon(props: ArrowBottomRightIconProps) {
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
          "M17.596 9.525a1 1 0 10-2 0v4.657L8.111 6.697 6.697 8.11l7.485 7.485H9.525a1 1 0 100 2h8.071v-8.07z"
        }
      ></path>
    </svg>
  );
}

export default ArrowBottomRightIcon;
/* prettier-ignore-end */
