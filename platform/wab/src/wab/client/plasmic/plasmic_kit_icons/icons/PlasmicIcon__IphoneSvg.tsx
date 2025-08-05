/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type IphoneSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function IphoneSvgIcon(props: IphoneSvgIconProps) {
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
          "M15.25 19.25h-6.5a2 2 0 01-2-2V6.75a2 2 0 012-2h6.5a2 2 0 012 2v10.5a2 2 0 01-2 2zm-3.5-2.5h.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default IphoneSvgIcon;
/* prettier-ignore-end */
