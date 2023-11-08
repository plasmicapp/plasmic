// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type DotBulletIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DotBulletIcon(props: DotBulletIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"currentcolor"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <circle
        fill={"currentColor"}
        transform={"rotate(-90 12 12)"}
        r={"3"}
        cy={"12"}
        cx={"12"}
      ></circle>
    </svg>
  );
}

export default DotBulletIcon;
/* prettier-ignore-end */
