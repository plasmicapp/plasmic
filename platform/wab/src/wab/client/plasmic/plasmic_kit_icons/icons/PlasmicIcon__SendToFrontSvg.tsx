// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SendToFrontSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SendToFrontSvgIcon(props: SendToFrontSvgIconProps) {
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
          "M10.75 12.75H10h.75zm2-2v.75-.75zm0 8.5V20v-.75zm-2-2h.75-.75zm8.5 0H20h-.75zm-2 2v-.75.75zm2-6.5h-.75.75zm-2-2V10v.75zm1.25 2v4.5H20v-4.5h-1.5zm-1.25 5.75h-4.5V20h4.5v-1.5zm-5.75-1.25v-4.5H10v4.5h1.5zm1.25-5.75h4.5V10h-4.5v1.5zm-1.25 1.25c0-.69.56-1.25 1.25-1.25V10A2.75 2.75 0 0010 12.75h1.5zm1.25 5.75c-.69 0-1.25-.56-1.25-1.25H10A2.75 2.75 0 0012.75 20v-1.5zm5.75-1.25c0 .69-.56 1.25-1.25 1.25V20A2.75 2.75 0 0020 17.25h-1.5zm1.5-4.5A2.75 2.75 0 0017.25 10v1.5c.69 0 1.25.56 1.25 1.25H20zm-14.25-8V4v.75zm.5.75a.75.75 0 000-1.5v1.5zm0 8.5a.75.75 0 000-1.5V14zm-.5-.75V14v-.75zM4 6.25a.75.75 0 001.5 0H4zm.75-.5h.75-.75zm8.5 0h-.75.75zm-.75.5a.75.75 0 001.5 0h-1.5zM11.75 4a.75.75 0 000 1.5V4zm.5.75v.75-.75zm-7.5 7.5h.75-.75zm.75-.5a.75.75 0 00-1.5 0h1.5zm.25-6.25h.5V4h-.5v1.5zm.5 7h-.5V14h.5v-1.5zM5.5 6.25v-.5H4v.5h1.5zm7-.5v.5H14v-.5h-1.5zm-.75-.25h.5V4h-.5v1.5zM5.5 12.25v-.5H4v.5h1.5zM5.75 4A1.75 1.75 0 004 5.75h1.5a.25.25 0 01.25-.25V4zm0 8.5a.25.25 0 01-.25-.25H4c0 .966.784 1.75 1.75 1.75v-1.5zM14 5.75A1.75 1.75 0 0012.25 4v1.5a.25.25 0 01.25.25H14z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default SendToFrontSvgIcon;
/* prettier-ignore-end */
