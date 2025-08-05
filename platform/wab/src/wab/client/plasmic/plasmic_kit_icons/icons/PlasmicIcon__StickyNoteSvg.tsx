/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type StickyNoteSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function StickyNoteSvgIcon(props: StickyNoteSvgIconProps) {
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
          "M13.75 19.25h-7a2 2 0 01-2-2V6.75a2 2 0 012-2h10.5a2 2 0 012 2v7m-5.5 5.5l5.5-5.5m-5.5 5.5v-4.5a1 1 0 011-1h4.5"
        }
      ></path>
    </svg>
  );
}

export default StickyNoteSvgIcon;
/* prettier-ignore-end */
