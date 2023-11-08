// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type AerialsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AerialsvgIcon(props: AerialsvgIconProps) {
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
        d={"M12.5 10a.5.5 0 11-1 0 .5.5 0 011 0z"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M9.25 13.25c-2.04-1.688-1.914-4.75 0-6.5m5.517 6.5c2.04-1.688 1.914-4.75 0-6.5m-2.517 6h-.5l-2 6.5h4.5l-2-6.5zm-5 2.5c-3.336-3.336-3.32-7.172 0-10.5m9.504 10.5c3.336-3.336 3.32-7.172 0-10.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default AerialsvgIcon;
/* prettier-ignore-end */
