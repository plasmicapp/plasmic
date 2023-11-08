// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type StethoscopesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function StethoscopesvgIcon(props: StethoscopesvgIconProps) {
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
          "M19.03 19.03c-.47.469-1.535.164-2.38-.68-.844-.845-1.149-1.91-.68-2.38.47-.469 1.535-.164 2.38.68.844.845 1.149 1.91.68 2.38zm-2.53-.78h-2.75a4 4 0 01-4-4v-2m0 0h-1a4 4 0 01-4-4v-3.5m5 7.5h1.5a4 4 0 004-4v-3.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default StethoscopesvgIcon;
/* prettier-ignore-end */
