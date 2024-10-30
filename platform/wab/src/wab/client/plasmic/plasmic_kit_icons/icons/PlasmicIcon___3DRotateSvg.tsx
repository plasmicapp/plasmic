// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type _3DRotateSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function _3DRotateSvgIcon(props: _3DRotateSvgIconProps) {
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
          "M4.75 12l-.35-.663a.75.75 0 000 1.326L4.75 12zM9 9.75l.35-.663a.75.75 0 00-.7 0L9 9.75zM13.25 12l.35.663a.75.75 0 000-1.326l-.35.663zM9 14.25l-.35.663a.75.75 0 00.7 0L9 14.25zm-3.9-1.587l4.25-2.25-.7-1.326-4.25 2.25.7 1.326zm3.55-2.25l4.25 2.25.7-1.326-4.25-2.25-.7 1.326zm4.25.924l-4.25 2.25.7 1.326 4.25-2.25-.7-1.326zm-3.55 2.25l-4.25-2.25-.7 1.326 4.25 2.25.7-1.326z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M14 12a.75.75 0 00-1.5 0H14zm-.75 5.25l.32.679a.75.75 0 00.43-.679h-.75zm-4.25 2l-.32.679a.75.75 0 00.64 0L9 19.25zm-4.25-2H4c0 .29.168.555.43.679l.32-.679zM5.5 12A.75.75 0 004 12h1.5zm7 0v5.25H14V12h-1.5zm.43 4.571l-4.25 2 .64 1.358 4.25-2-.64-1.358zm-3.61 2l-4.25-2-.64 1.358 4.25 2 .64-1.358zM5.5 17.25V12H4v5.25h1.5z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M9.75 14.5a.75.75 0 00-1.5 0h1.5zM8.25 19a.75.75 0 001.5 0h-1.5zm0-4.5V19h1.5v-4.5h-1.5zM11.75 4a.75.75 0 000 1.5V4zm4.5 8a.75.75 0 001.5 0h-1.5zm-4.5-6.5a4.5 4.5 0 014.5 4.5h1.5a6 6 0 00-6-6v1.5zm4.5 4.5v2h1.5v-2h-1.5z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M15.28 9.47a.75.75 0 10-1.06 1.06l1.06-1.06zM17 12.25l-.53.53a.75.75 0 001.06 0l-.53-.53zm2.78-1.72a.75.75 0 10-1.06-1.06l1.06 1.06zm-5.56 0l2.25 2.25 1.06-1.06-2.25-2.25-1.06 1.06zm3.31 2.25l2.25-2.25-1.06-1.06-2.25 2.25 1.06 1.06z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default _3DRotateSvgIcon;
/* prettier-ignore-end */
