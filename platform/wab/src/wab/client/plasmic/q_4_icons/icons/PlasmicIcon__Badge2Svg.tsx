// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Badge2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Badge2SvgIcon(props: Badge2SvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        stroke: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M10.705 5.23a2 2 0 012.595 0l.621.53c.321.273.72.438 1.14.472l.813.065a2 2 0 011.835 1.835l.065.813a2 2 0 00.471 1.139l.53.621a2 2 0 010 2.595l-.53.622a2 2 0 00-.471 1.138l-.065.814a2 2 0 01-1.835 1.835l-.814.065a2 2 0 00-1.139.471l-.62.53a2 2 0 01-2.596 0l-.621-.53a2.001 2.001 0 00-1.139-.471l-.813-.065a2 2 0 01-1.836-1.835l-.064-.814a2 2 0 00-.472-1.138l-.53-.622a2 2 0 010-2.595l.53-.621c.273-.32.438-.719.472-1.139l.064-.813a2 2 0 011.836-1.835l.813-.065a2 2 0 001.139-.472l.621-.53z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default Badge2SvgIcon;
/* prettier-ignore-end */
