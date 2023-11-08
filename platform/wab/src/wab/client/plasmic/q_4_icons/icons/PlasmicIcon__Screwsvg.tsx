// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ScrewsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ScrewsvgIcon(props: ScrewsvgIconProps) {
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
        d={
          "M9.75 8.25h-3v-3.5H9.5l2.5 1 2.5-1h2.75v3.5h-3m-4.5 0V17L12 19.25 14.25 17V8.25m-4.5 0h4.5M14 11l-4 1m4 2l-4 1"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ScrewsvgIcon;
/* prettier-ignore-end */
