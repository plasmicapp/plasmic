/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type HookSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function HookSvgIcon(props: HookSvgIconProps) {
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
          "M12 7.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5zm0 0V8c0 2.4-4.25 4-4.25 7s1.903 4.25 4.25 4.25A4.25 4.25 0 0016.25 15"
        }
      ></path>
    </svg>
  );
}

export default HookSvgIcon;
/* prettier-ignore-end */
