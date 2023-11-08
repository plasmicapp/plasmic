// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type VideoCameraOffsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function VideoCameraOffsvgIcon(props: VideoCameraOffsvgIconProps) {
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
        fillRule={"evenodd"}
        d={
          "M4.463 6.057a.75.75 0 01.817.163l10.5 10.5 2 2a.75.75 0 11-1.06 1.06L14.94 18H6.75A2.75 2.75 0 014 15.25v-8.5a.75.75 0 01.463-.693zM13.439 16.5L5.5 8.56v6.69c0 .69.56 1.25 1.25 1.25h6.69zm-.189-9h-3.5a.75.75 0 010-1.5h3.5A2.75 2.75 0 0116 8.718l2.882-1.622A.75.75 0 0120 7.75v8.5a.75.75 0 01-1.118.654l-4-2.25A.75.75 0 0114.5 14V8.75c0-.69-.56-1.25-1.25-1.25zM16 10.439v3.122l2.5 1.407V9.032L16 10.44z"
        }
        clipRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default VideoCameraOffsvgIcon;
/* prettier-ignore-end */
