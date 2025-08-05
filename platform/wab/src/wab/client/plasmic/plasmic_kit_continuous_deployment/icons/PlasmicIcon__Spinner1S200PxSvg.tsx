/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type Spinner1S200PxSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Spinner1S200PxSvgIcon(props: Spinner1S200PxSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      style={{
        background: "rgb(255, 255, 255)",
        fill: "currentcolor",

        ...(style || {}),
      }}
      viewBox={"0 0 100 100"}
      preserveAspectRatio={"xMidYMid"}
      display={"block"}
      shapeRendering={"auto"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <rect
        x={"47"}
        y={"24"}
        rx={"3"}
        ry={"6"}
        width={"6"}
        height={"12"}
        fill={"currentColor"}
      >
        <animate
          attributeName={"opacity"}
          values={"1;0"}
          keyTimes={"0;1"}
          dur={"1s"}
          begin={"-0.9166666666666666s"}
          repeatCount={"indefinite"}
        ></animate>
      </rect>

      <rect
        x={"47"}
        y={"24"}
        rx={"3"}
        ry={"6"}
        width={"6"}
        height={"12"}
        fill={"currentColor"}
        transform={"rotate(30 50 50)"}
      >
        <animate
          attributeName={"opacity"}
          values={"1;0"}
          keyTimes={"0;1"}
          dur={"1s"}
          begin={"-0.8333333333333334s"}
          repeatCount={"indefinite"}
        ></animate>
      </rect>

      <rect
        x={"47"}
        y={"24"}
        rx={"3"}
        ry={"6"}
        width={"6"}
        height={"12"}
        fill={"currentColor"}
        transform={"rotate(60 50 50)"}
      >
        <animate
          attributeName={"opacity"}
          values={"1;0"}
          keyTimes={"0;1"}
          dur={"1s"}
          begin={"-0.75s"}
          repeatCount={"indefinite"}
        ></animate>
      </rect>

      <rect
        x={"47"}
        y={"24"}
        rx={"3"}
        ry={"6"}
        width={"6"}
        height={"12"}
        fill={"currentColor"}
        transform={"rotate(90 50 50)"}
      >
        <animate
          attributeName={"opacity"}
          values={"1;0"}
          keyTimes={"0;1"}
          dur={"1s"}
          begin={"-0.6666666666666666s"}
          repeatCount={"indefinite"}
        ></animate>
      </rect>

      <rect
        x={"47"}
        y={"24"}
        rx={"3"}
        ry={"6"}
        width={"6"}
        height={"12"}
        fill={"currentColor"}
        transform={"rotate(120 50 50)"}
      >
        <animate
          attributeName={"opacity"}
          values={"1;0"}
          keyTimes={"0;1"}
          dur={"1s"}
          begin={"-0.5833333333333334s"}
          repeatCount={"indefinite"}
        ></animate>
      </rect>

      <rect
        x={"47"}
        y={"24"}
        rx={"3"}
        ry={"6"}
        width={"6"}
        height={"12"}
        fill={"currentColor"}
        transform={"rotate(150 50 50)"}
      >
        <animate
          attributeName={"opacity"}
          values={"1;0"}
          keyTimes={"0;1"}
          dur={"1s"}
          begin={"-0.5s"}
          repeatCount={"indefinite"}
        ></animate>
      </rect>

      <rect
        x={"47"}
        y={"24"}
        rx={"3"}
        ry={"6"}
        width={"6"}
        height={"12"}
        fill={"currentColor"}
        transform={"rotate(180 50 50)"}
      >
        <animate
          attributeName={"opacity"}
          values={"1;0"}
          keyTimes={"0;1"}
          dur={"1s"}
          begin={"-0.4166666666666667s"}
          repeatCount={"indefinite"}
        ></animate>
      </rect>

      <rect
        x={"47"}
        y={"24"}
        rx={"3"}
        ry={"6"}
        width={"6"}
        height={"12"}
        fill={"currentColor"}
        transform={"rotate(210 50 50)"}
      >
        <animate
          attributeName={"opacity"}
          values={"1;0"}
          keyTimes={"0;1"}
          dur={"1s"}
          begin={"-0.3333333333333333s"}
          repeatCount={"indefinite"}
        ></animate>
      </rect>

      <rect
        x={"47"}
        y={"24"}
        rx={"3"}
        ry={"6"}
        width={"6"}
        height={"12"}
        fill={"currentColor"}
        transform={"rotate(240 50 50)"}
      >
        <animate
          attributeName={"opacity"}
          values={"1;0"}
          keyTimes={"0;1"}
          dur={"1s"}
          begin={"-0.25s"}
          repeatCount={"indefinite"}
        ></animate>
      </rect>

      <rect
        x={"47"}
        y={"24"}
        rx={"3"}
        ry={"6"}
        width={"6"}
        height={"12"}
        fill={"currentColor"}
        transform={"rotate(270 50 50)"}
      >
        <animate
          attributeName={"opacity"}
          values={"1;0"}
          keyTimes={"0;1"}
          dur={"1s"}
          begin={"-0.16666666666666666s"}
          repeatCount={"indefinite"}
        ></animate>
      </rect>

      <rect
        x={"47"}
        y={"24"}
        rx={"3"}
        ry={"6"}
        width={"6"}
        height={"12"}
        fill={"currentColor"}
        transform={"rotate(300 50 50)"}
      >
        <animate
          attributeName={"opacity"}
          values={"1;0"}
          keyTimes={"0;1"}
          dur={"1s"}
          begin={"-0.08333333333333333s"}
          repeatCount={"indefinite"}
        ></animate>
      </rect>

      <rect
        x={"47"}
        y={"24"}
        rx={"3"}
        ry={"6"}
        width={"6"}
        height={"12"}
        fill={"currentColor"}
        transform={"rotate(330 50 50)"}
      >
        <animate
          attributeName={"opacity"}
          values={"1;0"}
          keyTimes={"0;1"}
          dur={"1s"}
          begin={"0s"}
          repeatCount={"indefinite"}
        ></animate>
      </rect>
    </svg>
  );
}

export default Spinner1S200PxSvgIcon;
/* prettier-ignore-end */
