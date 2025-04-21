/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type AnimationExitSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AnimationExitSvgIcon(props: AnimationExitSvgIconProps) {
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
          "M13.25 7l-.544-.543a2.412 2.412 0 00-3.41 0l-3.839 3.837a2.412 2.412 0 000 3.412l3.838 3.838c.942.941 2.47.941 3.411 0L13.25 17m6-5h-7.5m7.5 0l-2.5-2.25m2.5 2.25l-2.5 2.25"
        }
      ></path>
    </svg>
  );
}

export default AnimationExitSvgIcon;
/* prettier-ignore-end */
