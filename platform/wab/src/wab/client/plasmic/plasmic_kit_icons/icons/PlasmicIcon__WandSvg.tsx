/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type WandSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WandSvgIcon(props: WandSvgIconProps) {
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
          "M5.045 16.705L16.707 5.043a1 1 0 011.414 0l.836.836a1 1 0 010 1.414L7.295 18.955a1 1 0 01-1.414 0l-.836-.836a1 1 0 010-1.414zM15 7l2 2"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default WandSvgIcon;
/* prettier-ignore-end */
