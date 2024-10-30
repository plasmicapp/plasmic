// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type WriteNoteSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WriteNoteSvgIcon(props: WriteNoteSvgIconProps) {
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
          "M17.25 15.75v.5a3 3 0 01-3 3h-6.5a3 3 0 01-3-3v-8.5a3 3 0 013-3h2.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M18.74 7.728l.53.53-.53-.53zm-3.284 3.283l.53.53-.53-.53zm-.99.56l.183.727-.182-.727zm-2.716.679l-.728-.182a.75.75 0 00.91.91l-.182-.728zm.68-2.717l.727.182-.728-.182zm.56-.989l.53.53-.53-.53zm3.282-3.283l-.53-.53.53.53zm2.467 0l-.53.53.53-.53zm-.53 1.936l-3.283 3.283 1.06 1.061 3.284-3.283-1.061-1.06zm-3.924 3.646l-2.717.68.364 1.455 2.717-.68-.364-1.455zm-1.807 1.589l.679-2.717-1.455-.364-.68 2.717 1.456.364zm1.042-3.358l3.283-3.283-1.061-1.06-3.283 3.283 1.06 1.06zm-.363.641c.06-.242.186-.464.363-.64l-1.061-1.061a2.88 2.88 0 00-.757 1.337l1.455.364zm1.769.765a1.379 1.379 0 01-.641.363l.364 1.455a2.88 2.88 0 001.337-.757l-1.06-1.06zm3.283-4.689a.994.994 0 010 1.406l1.06 1.061a2.494 2.494 0 000-3.527l-1.06 1.06zm1.06-1.06a2.494 2.494 0 00-3.527 0l1.06 1.06a.994.994 0 011.407 0l1.06-1.06z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={"M7.75 15.25h6.5m-6.5-3h1.5m-1.5-3h1.5"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default WriteNoteSvgIcon;
/* prettier-ignore-end */
