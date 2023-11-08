// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BeachsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BeachsvgIcon(props: BeachsvgIconProps) {
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
          "M12 14.75c-6 0-7.25 4.5-7.25 4.5h14.5S18 14.75 12 14.75zm0 1.5V10m0-5.25c-2.761 0-5.25 2.489-5.25 5.25 0 0 1-1.25 2.625-1.25S12 10 12 10s1-1.25 2.625-1.25S17.25 10 17.25 10c0-2.761-2.489-5.25-5.25-5.25z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BeachsvgIcon;
/* prettier-ignore-end */
