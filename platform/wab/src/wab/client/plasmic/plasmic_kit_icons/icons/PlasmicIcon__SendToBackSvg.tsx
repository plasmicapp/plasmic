/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SendToBackSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SendToBackSvgIcon(props: SendToBackSvgIconProps) {
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
          "M4.75 11.25h.75-.75zm0-4.5H4h.75zm2-2v.75-.75zm4.5 0V4v.75zm-4 9.25a.75.75 0 000-1.5V14zm-.5-.75V14v-.75zm6.5-6.5h-.75.75zm-.75.5a.75.75 0 001.5 0h-1.5zm-7 4v-4.5H4v4.5h1.5zM6.75 5.5h4.5V4h-4.5v1.5zm.5 7h-.5V14h.5v-1.5zm5.25-5.75v.5H14v-.5h-1.5zm-7 0c0-.69.56-1.25 1.25-1.25V4A2.75 2.75 0 004 6.75h1.5zM4 11.25A2.75 2.75 0 006.75 14v-1.5c-.69 0-1.25-.56-1.25-1.25H4zm7.25-5.75c.69 0 1.25.56 1.25 1.25H14A2.75 2.75 0 0011.25 4v1.5zm7 13.75v-.75.75zm-.5-.75a.75.75 0 000 1.5v-1.5zm0-8.5a.75.75 0 000 1.5V10zm.5.75v.75-.75zm1.75 7a.75.75 0 00-1.5 0H20zm-.75.5H20h-.75zm-8.5 0H10h.75zm.75-.5a.75.75 0 00-1.5 0h1.5zm.75 2.25a.75.75 0 000-1.5V20zm-.5-.75V20v-.75zm7.5-7.5h-.75.75zm-.75.5a.75.75 0 001.5 0h-1.5zm-6.25-.75a.75.75 0 000-1.5v1.5zm-.5-.75V10v.75zm-1 1H10h.75zm-.75.5a.75.75 0 001.5 0H10zm8.25 6.25h-.5V20h.5v-1.5zm-.5-7h.5V10h-.5v1.5zm.75 6.25v.5H20v-.5h-1.5zm-7 .5v-.5H10v.5h1.5zm.75.25h-.5V20h.5v-1.5zm6.25-6.75v.5H20v-.5h-1.5zM12.25 10h-.5v1.5h.5V10zM10 11.75v.5h1.5v-.5H10zM11.75 10A1.75 1.75 0 0010 11.75h1.5a.25.25 0 01.25-.25V10zm6.5 10A1.75 1.75 0 0020 18.25h-1.5a.25.25 0 01-.25.25V20zm0-8.5a.25.25 0 01.25.25H20A1.75 1.75 0 0018.25 10v1.5zM10 18.25c0 .966.784 1.75 1.75 1.75v-1.5a.25.25 0 01-.25-.25H10z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default SendToBackSvgIcon;
/* prettier-ignore-end */
