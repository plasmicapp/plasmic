/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type AlignCenterVerticalSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AlignCenterVerticalSvgIcon(
  props: AlignCenterVerticalSvgIconProps
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
          "M7.75 7.75h.75-.75zm1-1v.75-.75zm0 3.5V11v-.75zm-1-1H7h.75zm8.5 0H17h-.75zm-1 1V9.5v.75zm1-2.5h-.75.75zm-1-1V6v.75zm.25 1v1.5H17v-1.5h-1.5zm-.25 1.75h-6.5V11h6.5V9.5zM8.5 9.25v-1.5H7v1.5h1.5zm.25-1.75h6.5V6h-6.5v1.5zm-.25.25a.25.25 0 01.25-.25V6A1.75 1.75 0 007 7.75h1.5zm.25 1.75a.25.25 0 01-.25-.25H7c0 .966.784 1.75 1.75 1.75V9.5zm6.75-.25a.25.25 0 01-.25.25V11A1.75 1.75 0 0017 9.25h-1.5zm1.5-1.5A1.75 1.75 0 0015.25 6v1.5a.25.25 0 01.25.25H17zm-7.25 7h.75-.75zm1-1v.75-.75zm0 3.5V18v-.75zm-1-1H9h.75zm4.5 0H15h-.75zm-1 1v-.75.75zm1-2.5h-.75.75zm-1-1V13v.75zm.25 1v1.5H15v-1.5h-1.5zm-.25 1.75h-2.5V18h2.5v-1.5zm-2.75-.25v-1.5H9v1.5h1.5zm.25-1.75h2.5V13h-2.5v1.5zm-.25.25a.25.25 0 01.25-.25V13A1.75 1.75 0 009 14.75h1.5zm.25 1.75a.25.25 0 01-.25-.25H9c0 .966.784 1.75 1.75 1.75v-1.5zm2.75-.25a.25.25 0 01-.25.25V18A1.75 1.75 0 0015 16.25h-1.5zm1.5-1.5A1.75 1.75 0 0013.25 13v1.5a.25.25 0 01.25.25H15z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M12.75 17.75a.75.75 0 00-1.5 0h1.5zm-1.5 1.5a.75.75 0 001.5 0h-1.5zm0-1.5v1.5h1.5v-1.5h-1.5zm1.5-7a.75.75 0 00-1.5 0h1.5zm-1.5 2.5a.75.75 0 001.5 0h-1.5zm0-2.5v2.5h1.5v-2.5h-1.5zm1.5-6a.75.75 0 00-1.5 0h1.5zm-1.5 1.5a.75.75 0 001.5 0h-1.5zm0-1.5v1.5h1.5v-1.5h-1.5z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default AlignCenterVerticalSvgIcon;
/* prettier-ignore-end */
