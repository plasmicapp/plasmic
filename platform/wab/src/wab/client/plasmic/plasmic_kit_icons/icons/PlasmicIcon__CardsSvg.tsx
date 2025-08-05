/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CardsSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CardsSvgIcon(props: CardsSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M14.25 4.75h-8.5a1 1 0 00-1 1v12.5a1 1 0 001 1h8.5a1 1 0 001-1V5.75a1 1 0 00-1-1zm3.5 0h.5a1 1 0 011 1v12.5a1 1 0 01-1 1h-.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default CardsSvgIcon;
/* prettier-ignore-end */
