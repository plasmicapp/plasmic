// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type TagAddSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TagAddSvgIcon(props: TagAddSvgIconProps) {
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
          "M12 4.75V4a.75.75 0 00-.52.21l.52.54zm7.25 0H20a.75.75 0 00-.75-.75v.75zM18.5 12a.75.75 0 001.5 0h-1.5zm-9.363 7.136a.75.75 0 001.094-1.027l-1.094 1.027zM5.29 13.94l.547-.513-.547.513zm.072-2.81l.52.54-.52-.54zM12 5.5h7.25V4H12v1.5zm6.5-.75V12H20V4.75h-1.5zm-8.27 13.36l-4.393-4.682-1.094 1.026 4.394 4.682 1.094-1.027zm-4.393-4.682a1.25 1.25 0 01.045-1.757l-1.04-1.081a2.75 2.75 0 00-.099 3.864l1.094-1.026zm.045-1.757l6.638-6.38-1.04-1.082-6.637 6.38 1.039 1.082zM15 9v1a1 1 0 001-1h-1zm0 0h-1a1 1 0 001 1V9zm0 0V8a1 1 0 00-1 1h1zm0 0h1a1 1 0 00-1-1v1zm1.75 5.75a.75.75 0 00-1.5 0h1.5zm-1.5 4.5a.75.75 0 001.5 0h-1.5zm0-4.5v4.5h1.5v-4.5h-1.5z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M18.25 17.75a.75.75 0 000-1.5v1.5zm-4.5-1.5a.75.75 0 000 1.5v-1.5zm4.5 0h-4.5v1.5h4.5v-1.5z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default TagAddSvgIcon;
/* prettier-ignore-end */
