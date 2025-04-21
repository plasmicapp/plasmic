/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ContactsSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ContactsSvgIcon(props: ContactsSvgIconProps) {
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
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M16.75 4.75h1.5a1 1 0 011 1v2.5m-2.5-3.5h-9a3 3 0 00-3 3v8.5a3 3 0 003 3h9m0-14.5v3.5m0 11h1.5a1 1 0 001-1v-2.5m-2.5 3.5v-3.5m0-7.5h2.5m-2.5 0V12m2.5-3.75V12m-2.5 3.75h2.5m-2.5 0V12m2.5 3.75V12m-2.5 0h2.5m-10.5 3.25s.675-1.5 2.25-1.5 2.25 1.5 2.25 1.5m-1-5.25a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0z"
        }
      ></path>
    </svg>
  );
}

export default ContactsSvgIcon;
/* prettier-ignore-end */
