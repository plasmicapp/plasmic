/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type MarkIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MarkIcon(props: MarkIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 32 32"}
      className={classNames(
        "plasmic-default__svg",
        className,
        "plasmic-default__svg plasmic_default__all plasmic_default__svg TopBar__svg__jQrU5"
      )}
      role={"img"}
      height={"1em"}
      width={"1em"}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M3.2 22C3.2 14.93 8.93 9.2 16 9.2S28.8 14.93 28.8 22H32c0-8.837-7.163-16-16-16S0 13.163 0 22h3.2z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M24 22a8 8 0 10-16 0H4.8c0-6.185 5.015-11.2 11.2-11.2S27.2 15.815 27.2 22H24z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={"M12.8 22a3.2 3.2 0 016.4 0h3.2a6.4 6.4 0 10-12.8 0h3.2z"}
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default MarkIcon;
/* prettier-ignore-end */
