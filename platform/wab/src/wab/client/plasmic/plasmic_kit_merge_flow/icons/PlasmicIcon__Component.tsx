// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ComponentIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ComponentIcon(props: ComponentIconProps) {
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

      <ellipse
        rx={"3.333"}
        ry={"7.5"}
        transform={"scale(1 -1) rotate(45 17.071 7.071)"}
        stroke={"currentColor"}
        strokeWidth={"1.25"}
      ></ellipse>

      <ellipse
        cx={"10"}
        cy={"10"}
        rx={"3.333"}
        ry={"7.5"}
        transform={"rotate(-135 10 10)"}
        stroke={"currentColor"}
        strokeWidth={"1.25"}
      ></ellipse>
    </svg>
  );
}

export default ComponentIcon;
/* prettier-ignore-end */
