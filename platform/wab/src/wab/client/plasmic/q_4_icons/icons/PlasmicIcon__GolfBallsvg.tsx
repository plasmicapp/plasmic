// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type GolfBallsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GolfBallsvgIcon(props: GolfBallsvgIconProps) {
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
          "M8.751 14.752L10.75 18v1.25h2.5V18l1.999-3.248m-6.498 0l-.001-.002m.001.002C8.785 14.806 9.557 16 12 16s3.215-1.194 3.249-1.248m.001-.002l-.001.002M16.25 9a4.25 4.25 0 11-8.5 0 4.25 4.25 0 018.5 0z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M14.5 12a.5.5 0 11-1 0 .5.5 0 011 0zm-4 0a.5.5 0 11-1 0 .5.5 0 011 0zm0-6a.5.5 0 11-1 0 .5.5 0 011 0zm4 0a.5.5 0 11-1 0 .5.5 0 011 0zm2 3a.5.5 0 11-1 0 .5.5 0 011 0zm-8 0a.5.5 0 11-1 0 .5.5 0 011 0zm4 0a.5.5 0 11-1 0 .5.5 0 011 0z"
        }
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GolfBallsvgIcon;
/* prettier-ignore-end */
