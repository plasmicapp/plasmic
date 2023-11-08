// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type TicketsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TicketsvgIcon(props: TicketsvgIconProps) {
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
          "M19.25 6.75a1 1 0 00-1-1H5.75a1 1 0 00-1 1v1.296c0 .463.328.852.74 1.065a3.25 3.25 0 010 5.778c-.412.213-.74.602-.74 1.065v1.296a1 1 0 001 1h12.5a1 1 0 001-1v-1.296c0-.463-.328-.852-.74-1.065a3.25 3.25 0 010-5.778c.412-.213.74-.602.74-1.065V6.75z"
        }
      ></path>
    </svg>
  );
}

export default TicketsvgIcon;
/* prettier-ignore-end */
