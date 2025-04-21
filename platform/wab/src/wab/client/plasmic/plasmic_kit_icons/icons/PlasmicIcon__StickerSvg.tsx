/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type StickerSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function StickerSvgIcon(props: StickerSvgIconProps) {
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
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M19.25 12A7.25 7.25 0 1112 4.75M19.25 12C14 12 12 10 12 4.75L19.25 12z"
        }
      ></path>
    </svg>
  );
}

export default StickerSvgIcon;
/* prettier-ignore-end */
