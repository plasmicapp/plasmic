// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type IphonesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function IphonesvgIcon(props: IphonesvgIconProps) {
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

export default IphonesvgIcon;
/* prettier-ignore-end */
