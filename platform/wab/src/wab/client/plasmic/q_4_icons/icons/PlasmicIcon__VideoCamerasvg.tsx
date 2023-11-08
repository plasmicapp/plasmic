// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type VideoCamerasvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function VideoCamerasvgIcon(props: VideoCamerasvgIconProps) {
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
        fill={"currentColor"}
        d={
          "M15.114 9.357a.75.75 0 00.772 1.286l-.772-1.286zM19.25 7.75H20a.75.75 0 00-1.136-.643l.386.643zm0 8.5l-.386.643A.75.75 0 0020 16.25h-.75zm-3.364-2.893a.75.75 0 10-.772 1.286l.772-1.286zm0-2.714l3.75-2.25-.772-1.286-3.75 2.25.772 1.286zM18.5 7.75v8.5H20v-8.5h-1.5zm1.136 7.857l-3.75-2.25-.772 1.286 3.75 2.25.772-1.286zM6.75 7.5h6.5V6h-6.5v1.5zm7.75 1.25v6.5H16v-6.5h-1.5zm-1.25 7.75h-6.5V18h6.5v-1.5zM5.5 15.25v-6.5H4v6.5h1.5zm1.25 1.25c-.69 0-1.25-.56-1.25-1.25H4A2.75 2.75 0 006.75 18v-1.5zm7.75-1.25c0 .69-.56 1.25-1.25 1.25V18A2.75 2.75 0 0016 15.25h-1.5zM13.25 7.5c.69 0 1.25.56 1.25 1.25H16A2.75 2.75 0 0013.25 6v1.5zM6.75 6A2.75 2.75 0 004 8.75h1.5c0-.69.56-1.25 1.25-1.25V6z"
        }
      ></path>
    </svg>
  );
}

export default VideoCamerasvgIcon;
/* prettier-ignore-end */
