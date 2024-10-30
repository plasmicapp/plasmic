// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type AnimationEnterSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AnimationEnterSvgIcon(props: AnimationEnterSvgIconProps) {
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
          "M10.75 7l.544-.543a2.412 2.412 0 013.412 0l3.838 3.837c.941.942.941 2.47 0 3.412l-3.838 3.838a2.412 2.412 0 01-3.412 0L10.751 17m1.499-5h-7.5m7.5 0l-2.5-2.25m2.5 2.25l-2.5 2.25"
        }
      ></path>
    </svg>
  );
}

export default AnimationEnterSvgIcon;
/* prettier-ignore-end */
