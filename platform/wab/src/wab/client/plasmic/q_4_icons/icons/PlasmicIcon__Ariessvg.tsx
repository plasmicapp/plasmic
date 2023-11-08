// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type AriessvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AriessvgIcon(props: AriessvgIconProps) {
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
          "M5.432 8.614A2.25 2.25 0 017 4.75c1.157 0 1.85 1.249 2.247 2.336C10.227 9.774 12 15.197 12 19.25m6.567-10.636A2.25 2.25 0 0017 4.75c-1.157 0-1.85 1.249-2.247 2.336C13.773 9.774 12 15.197 12 19.25"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default AriessvgIcon;
/* prettier-ignore-end */
