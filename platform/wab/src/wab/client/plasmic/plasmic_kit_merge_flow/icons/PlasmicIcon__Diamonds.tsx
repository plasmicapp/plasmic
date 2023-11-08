// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type DiamondsIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DiamondsIcon(props: DiamondsIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 20 20"}
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
          "M7.917 7.5C8.97 6.29 10 3.958 10 3.958S11.03 6.29 12.083 7.5c1.027 1.179 3.125 2.5 3.125 2.5s-2.098 1.321-3.125 2.5C11.03 13.71 10 16.042 10 16.042S8.97 13.71 7.917 12.5C6.89 11.321 4.792 10 4.792 10S6.89 8.679 7.917 7.5z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.25"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default DiamondsIcon;
/* prettier-ignore-end */
