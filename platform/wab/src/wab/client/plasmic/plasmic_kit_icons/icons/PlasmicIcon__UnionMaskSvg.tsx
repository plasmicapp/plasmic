// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type UnionMaskSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function UnionMaskSvgIcon(props: UnionMaskSvgIconProps) {
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
          "M13.25 10.75h-.75c0 .414.336.75.75.75v-.75zm-2.5 2.5h.75a.75.75 0 00-.75-.75v.75zm-.97-7.97a.75.75 0 00-1.06-1.06l1.06 1.06zM4.22 8.72a.75.75 0 001.06 1.06L4.22 8.72zm8.56-2.44a.75.75 0 00-1.06-1.06l1.06 1.06zm-7.56 5.44a.75.75 0 101.06 1.06l-1.06-1.06zm8.31-2.19a.75.75 0 00-1.06-1.06l1.06 1.06zm-5.31 3.19a.75.75 0 101.06 1.06l-1.06-1.06zm7.31-1.19a.75.75 0 10-1.06-1.06l1.06 1.06zm-5.31 3.19a.75.75 0 101.06 1.06l-1.06-1.06zm9.31.81a.75.75 0 10-1.06-1.06l1.06 1.06zm-5.31 3.19a.75.75 0 101.06 1.06l-1.06-1.06zm4.31-6.19a.75.75 0 10-1.06-1.06l1.06 1.06zm-7.56 5.44a.75.75 0 101.06 1.06l-1.06-1.06zM5.5 11.25v-4.5H4v4.5h1.5zM6.75 5.5h4.5V4h-4.5v1.5zM14 10.75v-4h-1.5v4H14zm-3.25 1.75h-4V14h4v-1.5zm6.5 6h-4.5V20h4.5v-1.5zM20 17.25v-4.5h-1.5v4.5H20zm-6.75-5.75h4V10h-4v1.5zm-1.75 5.75v-4H10v4h1.5zm8.5-4.5A2.75 2.75 0 0017.25 10v1.5c.69 0 1.25.56 1.25 1.25H20zm-7.25 5.75c-.69 0-1.25-.56-1.25-1.25H10A2.75 2.75 0 0012.75 20v-1.5zm4.5 1.5A2.75 2.75 0 0020 17.25h-1.5c0 .69-.56 1.25-1.25 1.25V20zm-6-14.5c.69 0 1.25.56 1.25 1.25H14A2.75 2.75 0 0011.25 4v1.5zM5.5 6.75c0-.69.56-1.25 1.25-1.25V4A2.75 2.75 0 004 6.75h1.5zM4 11.25A2.75 2.75 0 006.75 14v-1.5c-.69 0-1.25-.56-1.25-1.25H4zm4.72-7.03l-4.5 4.5 1.06 1.06 4.5-4.5-1.06-1.06zm3 1l-6.5 6.5 1.06 1.06 6.5-6.5-1.06-1.06zm.75 3.25l-4.25 4.25 1.06 1.06 4.25-4.25-1.06-1.06zm2 2l-4.25 4.25 1.06 1.06 4.25-4.25-1.06-1.06zm4 4l-4.25 4.25 1.06 1.06 4.25-4.25-1.06-1.06zm-1-3l-6.5 6.5 1.06 1.06 6.5-6.5-1.06-1.06z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default UnionMaskSvgIcon;
/* prettier-ignore-end */
