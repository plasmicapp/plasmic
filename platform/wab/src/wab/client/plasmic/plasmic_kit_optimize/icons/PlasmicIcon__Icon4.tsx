// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon4IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon4Icon(props: Icon4IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 16 16"}
      height={"1em"}
      width={"1em"}
      style={{
        fill: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fillRule={"evenodd"}
        clipRule={"evenodd"}
        d={
          "M1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM8 0a8 8 0 100 16A8 8 0 008 0zm.67 4.415a.75.75 0 00-1.34 0l-3.25 6.5a.75.75 0 101.34.67L6.215 10h3.572l.793 1.585a.75.75 0 101.342-.67l-3.25-6.5zM8 6.427L9.036 8.5H6.964L8 6.427z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default Icon4Icon;
/* prettier-ignore-end */
