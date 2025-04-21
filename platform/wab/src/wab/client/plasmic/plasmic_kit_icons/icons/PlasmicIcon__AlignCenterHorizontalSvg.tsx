/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type AlignCenterHorizontalSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AlignCenterHorizontalSvgIcon(
  props: AlignCenterHorizontalSvgIconProps
) {
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
          "M7.75 8.5h1.5V7h-1.5v1.5zm1.75.25v6.5H11v-6.5H9.5zm-.25 6.75h-1.5V17h1.5v-1.5zm-1.75-.25v-6.5H6v6.5h1.5zm.25.25a.25.25 0 01-.25-.25H6c0 .966.784 1.75 1.75 1.75v-1.5zm1.75-.25a.25.25 0 01-.25.25V17A1.75 1.75 0 0011 15.25H9.5zM9.25 8.5a.25.25 0 01.25.25H11A1.75 1.75 0 009.25 7v1.5zM7.75 7A1.75 1.75 0 006 8.75h1.5a.25.25 0 01.25-.25V7zm7 3.5h1.5V9h-1.5v1.5zm1.75.25v2.5H18v-2.5h-1.5zm-.25 2.75h-1.5V15h1.5v-1.5zm-1.75-.25v-2.5H13v2.5h1.5zm.25.25a.25.25 0 01-.25-.25H13c0 .966.784 1.75 1.75 1.75v-1.5zm1.75-.25a.25.25 0 01-.25.25V15A1.75 1.75 0 0018 13.25h-1.5zm-.25-2.75a.25.25 0 01.25.25H18A1.75 1.75 0 0016.25 9v1.5zM14.75 9A1.75 1.75 0 0013 10.75h1.5a.25.25 0 01.25-.25V9z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M17.75 11.25a.75.75 0 000 1.5v-1.5zm1.5 1.5a.75.75 0 000-1.5v1.5zm-1.5 0h1.5v-1.5h-1.5v1.5zm-7-1.5a.75.75 0 000 1.5v-1.5zm2.5 1.5a.75.75 0 000-1.5v1.5zm-2.5 0h2.5v-1.5h-2.5v1.5zm-6-1.5a.75.75 0 000 1.5v-1.5zm1.5 1.5a.75.75 0 000-1.5v1.5zm-1.5 0h1.5v-1.5h-1.5v1.5z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default AlignCenterHorizontalSvgIcon;
/* prettier-ignore-end */
