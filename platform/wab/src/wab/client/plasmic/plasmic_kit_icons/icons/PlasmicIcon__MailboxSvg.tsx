// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type MailboxSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MailboxSvgIcon(props: MailboxSvgIconProps) {
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
          "M10.5 8v7.25H12V8h-1.5zm-5 7.25V8H4v7.25h1.5zm4.75.25h-4.5V17h4.5v-1.5zM4 15.25c0 .966.784 1.75 1.75 1.75v-1.5a.25.25 0 01-.25-.25H4zm6.5 0a.25.25 0 01-.25.25V17A1.75 1.75 0 0012 15.25h-1.5zM8 5.5A2.5 2.5 0 0110.5 8H12a4 4 0 00-4-4v1.5zM8 4a4 4 0 00-4 4h1.5A2.5 2.5 0 018 5.5V4zm0 5v1a1 1 0 001-1H8zm0 0H7a1 1 0 001 1V9zm0 0V8a1 1 0 00-1 1h1zm0 0h1a1 1 0 00-1-1v1z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M8.75 4a.75.75 0 000 1.5V4zm0 11.5a.75.75 0 000 1.5v-1.5zm0-10h6.5V4h-6.5v1.5zm9.75 3.25v6.5H20v-6.5h-1.5zm-.25 6.75h-9.5V17h9.5v-1.5zm.25-.25a.25.25 0 01-.25.25V17A1.75 1.75 0 0020 15.25h-1.5zM15.25 5.5a3.25 3.25 0 013.25 3.25H20A4.75 4.75 0 0015.25 4v1.5zm-.5 2.75a.75.75 0 000 1.5v-1.5zm1.5 1.5a.75.75 0 000-1.5v1.5zm-1.5 0h1.5v-1.5h-1.5v1.5z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M16 16.5a.75.75 0 00-1.5 0H16zm-1.5 2.75a.75.75 0 001.5 0h-1.5zm0-2.75v2.75H16V16.5h-1.5z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default MailboxSvgIcon;
/* prettier-ignore-end */
