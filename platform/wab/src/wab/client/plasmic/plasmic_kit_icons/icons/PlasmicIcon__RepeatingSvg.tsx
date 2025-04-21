/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type RepeatingSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function RepeatingSvgIcon(props: RepeatingSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        fill: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fillRule={"evenodd"}
        clipRule={"evenodd"}
        d={
          "M3 5.75A2.75 2.75 0 015.75 3h4.75A2.5 2.5 0 0113 5.5a.75.75 0 01-1.5 0 1 1 0 00-1-1H5.75c-.69 0-1.25.56-1.25 1.25v4.75a1 1 0 001 1 .75.75 0 010 1.5A2.5 2.5 0 013 10.5V5.75zm4 4A2.75 2.75 0 019.75 7h4.75A2.5 2.5 0 0117 9.5a.75.75 0 01-1.5 0 1 1 0 00-1-1H9.75c-.69 0-1.25.56-1.25 1.25v4.75a1 1 0 001 1 .75.75 0 010 1.5A2.5 2.5 0 017 14.5V9.75zM13.75 11A2.75 2.75 0 0011 13.75v4.5A2.75 2.75 0 0013.75 21h4.5A2.75 2.75 0 0021 18.25v-4.5A2.75 2.75 0 0018.25 11h-4.5zm-1.25 2.75c0-.69.56-1.25 1.25-1.25h4.5c.69 0 1.25.56 1.25 1.25v4.5c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default RepeatingSvgIcon;
/* prettier-ignore-end */
