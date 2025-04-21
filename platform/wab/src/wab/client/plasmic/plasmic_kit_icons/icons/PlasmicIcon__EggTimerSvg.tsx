/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type EggTimerSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EggTimerSvgIcon(props: EggTimerSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        stroke: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M18.25 4.75H5.75l1.1 3.669c.522 1.736 1.737 3.055 3.4 3.581-1.663.526-2.878 1.845-3.4 3.581l-1.1 3.669h12.5l-1.1-3.669c-.521-1.736-1.737-3.055-3.4-3.581 1.663-.526 2.878-1.845 3.4-3.581l1.1-3.669z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default EggTimerSvgIcon;
/* prettier-ignore-end */
