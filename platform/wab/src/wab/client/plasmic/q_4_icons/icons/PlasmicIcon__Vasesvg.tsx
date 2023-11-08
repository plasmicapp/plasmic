// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type VasesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function VasesvgIcon(props: VasesvgIconProps) {
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
          "M17.25 17c0 1.243-2.35 2.25-5.25 2.25S6.75 18.243 6.75 17m0 0c0-3.775 2.673-5.992 2.973-8.331a2.054 2.054 0 00-.088-.823L8.75 4.75h6.5l-.885 3.096a2.053 2.053 0 00-.088.823c.3 2.34 2.973 4.556 2.973 8.331"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default VasesvgIcon;
/* prettier-ignore-end */
