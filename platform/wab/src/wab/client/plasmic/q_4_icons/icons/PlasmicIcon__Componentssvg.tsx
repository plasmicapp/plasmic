// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ComponentssvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ComponentssvgIcon(props: ComponentssvgIconProps) {
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
          "M9.75 7L12 4.75 14.25 7 12 9.25 9.75 7zm5 5L17 9.75 19.25 12 17 14.25 14.75 12zm-5 5L12 14.75 14.25 17 12 19.25 9.75 17zm-5-5L7 9.75 9.25 12 7 14.25 4.75 12z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ComponentssvgIcon;
/* prettier-ignore-end */
