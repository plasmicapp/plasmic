// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type MinusIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MinusIcon(props: MinusIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 64 64"}
      height={"1em"}
      width={"1em"}
      style={{
        fill: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <rect
        x={"12"}
        y={"34"}
        width={"4"}
        height={"40"}
        rx={"2"}
        transform={"rotate(-90 12 34)"}
        fill={"currentColor"}
      ></rect>
    </svg>
  );
}

export default MinusIcon;
/* prettier-ignore-end */
