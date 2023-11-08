// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type MagicHatsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MagicHatsvgIcon(props: MagicHatsvgIconProps) {
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
          "M18.173 15.04c.717-.183 1.348.297.968.88-.88 1.347-3.194 3.33-7.14 3.33-3.947 0-6.255-1.983-7.134-3.33-.38-.583.251-1.063.968-.88 1.273.324 3.555.698 6.165.698s4.9-.374 6.173-.699z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M6.75 15V8.75a2 2 0 012-2h2.5m6 6V15M17 4.75C17 5.897 15.897 7 14.75 7 15.897 7 17 8.103 17 9.25 17 8.103 18.103 7 19.25 7 18.103 7 17 5.897 17 4.75z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default MagicHatsvgIcon;
/* prettier-ignore-end */
