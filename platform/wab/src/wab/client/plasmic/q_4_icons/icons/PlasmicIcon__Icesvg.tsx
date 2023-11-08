// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type IcesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function IcesvgIcon(props: IcesvgIconProps) {
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
          "M12 7v10m5-5H7m9.25 4.25l-8.5-8.5m8.5 0l-8.5 8.5m2-11.5L12 7l2.25-2.25m5 5L17 12l2.25 2.25m-9.5 5l2.25-2.5 2.25 2.5m-9.5-9.5L7.25 12l-2.5 2.25"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default IcesvgIcon;
/* prettier-ignore-end */
