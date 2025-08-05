/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type Icon4IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon4Icon(props: Icon4IconProps) {
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
          "M12 18.25c5.5 0 7.25-5.25 7.25-6.25S17.5 5.75 12 5.75 4.75 11 4.75 12 6.5 18.25 12 18.25zm0-2.5a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M18.5 12c0 .11-.07.522-.307 1.123a7.806 7.806 0 01-1.096 1.915C16.083 16.333 14.474 17.5 12 17.5V19c3.026 0 5.042-1.458 6.278-3.038a9.306 9.306 0 001.31-2.288C19.851 13.009 20 12.39 20 12h-1.5zM12 6.5c2.474 0 4.083 1.167 5.097 2.462a7.805 7.805 0 011.096 1.915c.237.601.307 1.013.307 1.123H20c0-.39-.15-1.01-.412-1.674a9.307 9.307 0 00-1.31-2.288C17.042 6.458 15.026 5 12 5v1.5zM5.5 12c0-.11.07-.522.307-1.123a7.805 7.805 0 011.096-1.915C7.917 7.667 9.526 6.5 12 6.5V5C8.974 5 6.958 6.458 5.722 8.038a9.303 9.303 0 00-1.31 2.288C4.149 10.991 4 11.61 4 12h1.5zm6.5 5.5c-2.474 0-4.083-1.167-5.097-2.462a7.806 7.806 0 01-1.096-1.915C5.569 12.522 5.5 12.11 5.5 12H4c0 .39.15 1.01.412 1.674.272.69.697 1.505 1.31 2.288C6.958 17.542 8.974 19 12 19v-1.5zm3-5.5a3 3 0 01-3 3v1.5a4.5 4.5 0 004.5-4.5H15zm-3-3a3 3 0 013 3h1.5A4.5 4.5 0 0012 7.5V9zm-3 3a3 3 0 013-3V7.5A4.5 4.5 0 007.5 12H9zm3 3a3 3 0 01-3-3H7.5a4.5 4.5 0 004.5 4.5V15z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default Icon4Icon;
/* prettier-ignore-end */
