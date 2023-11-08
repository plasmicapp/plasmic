// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type LightningsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LightningsvgIcon(props: LightningsvgIconProps) {
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
          "M7.25 15.25c-1.25 0-2.5-1.455-2.5-3.25a3.25 3.25 0 013.007-3.241 4.25 4.25 0 018.486 0A3.25 3.25 0 0119.25 12c0 1.795-1.25 3.25-2.5 3.25"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M12.25 12.75l-1.5 3.5h2.5l-1.5 3"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default LightningsvgIcon;
/* prettier-ignore-end */
