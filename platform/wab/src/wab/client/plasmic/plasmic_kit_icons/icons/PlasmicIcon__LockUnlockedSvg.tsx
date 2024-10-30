// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type LockUnlockedSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LockUnlockedSvgIcon(props: LockUnlockedSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M5.75 11.75a1 1 0 011-1h10.5a1 1 0 011 1v5.5a2 2 0 01-2 2h-8.5a2 2 0 01-2-2v-5.5zm2-1.25v-.657c0-1.228-.05-2.544.674-3.537C9 5.517 10.057 4.75 12 4.75c2 0 3.25 1.5 3.25 1.5"
        }
      ></path>
    </svg>
  );
}

export default LockUnlockedSvgIcon;
/* prettier-ignore-end */
