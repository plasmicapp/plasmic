// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BanksvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BanksvgIcon(props: BanksvgIconProps) {
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
          "M18.25 11.5v7.75m-12.5 0V11.5m4 7.75V11.5m4.5 7.75V11.5M12 4.75l7.25 6.5H4.75L12 4.75zm-7.25 14.5h14.5"
        }
      ></path>
    </svg>
  );
}

export default BanksvgIcon;
/* prettier-ignore-end */
