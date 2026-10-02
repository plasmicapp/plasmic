/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type StopCircleIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function StopCircleIcon(props: StopCircleIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      stroke={"currentColor"}
      strokeLinecap={"round"}
      strokeLinejoin={"round"}
      strokeWidth={"1.5"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={"M12 19.25a7.25 7.25 0 1 1 0-14.5 7.25 7.25 0 0 1 0 14.5"}
      ></path>

      <path
        fill={"currentColor"}
        d={
          "M10.75 10.25h2.5a.5.5 0 0 1 .5.5v2.5a.5.5 0 0 1-.5.5h-2.5a.5.5 0 0 1-.5-.5v-2.5a.5.5 0 0 1 .5-.5"
        }
      ></path>
    </svg>
  );
}

export default StopCircleIcon;
/* prettier-ignore-end */
