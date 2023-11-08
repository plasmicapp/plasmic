// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type AnnouncementsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AnnouncementsvgIcon(props: AnnouncementsvgIconProps) {
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
        strokeWidth={"1.5"}
        d={
          "M19.25 10c0 2.729-1.4 5.25-2.75 5.25s-2.75-2.521-2.75-5.25 1.4-5.25 2.75-5.25 2.75 2.521 2.75 5.25z"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        d={
          "M16.5 15.25S8 13.5 7 13.25 4.75 11.69 4.75 10 6 7 7 6.75s9.5-2 9.5-2M6.75 13.5v3.75a2 2 0 002 2h.5a2 2 0 002-2V14.5"
        }
      ></path>
    </svg>
  );
}

export default AnnouncementsvgIcon;
/* prettier-ignore-end */
