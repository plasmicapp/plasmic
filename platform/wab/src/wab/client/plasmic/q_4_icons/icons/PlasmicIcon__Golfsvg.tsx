// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type GolfsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GolfsvgIcon(props: GolfsvgIconProps) {
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
          "M12 14.75c-5 0-6.583 3.167-7.25 4.5h14.5c-.667-1.333-2.25-4.5-7.25-4.5zm-.25 1.5v-7m0 0v-4.5L17.25 7l-5.5 2.25z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GolfsvgIcon;
/* prettier-ignore-end */
