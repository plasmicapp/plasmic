/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type Icon7IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon7Icon(props: Icon7IconProps) {
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
          "M4.75 8.25A.75.75 0 015.5 9c0 .11.07.522.307 1.123a7.83 7.83 0 001.096 1.915C7.917 13.333 9.526 14.5 12 14.5s4.083-1.167 5.097-2.462a7.803 7.803 0 001.096-1.915c.238-.601.307-1.013.307-1.123A.75.75 0 0120 9c0 .39-.15 1.01-.412 1.674-.07.178-.15.365-.242.557l2.41.999a.75.75 0 11-.573 1.385l-2.595-1.074c-.097.14-.2.281-.31.421-.695.889-1.637 1.739-2.867 2.313l1.205 2.908a.75.75 0 01-1.386.574l-1.238-2.987A8.453 8.453 0 0112 16c-.72 0-1.383-.083-1.992-.23L8.77 18.757a.75.75 0 01-1.385-.574l1.204-2.908c-1.23-.574-2.172-1.424-2.867-2.313-.11-.14-.213-.28-.31-.421l-2.595 1.074a.75.75 0 01-.574-1.385l2.411-.999a9.065 9.065 0 01-.242-.557C4.149 10.009 4 9.39 4 9a.75.75 0 01.75-.75z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default Icon7Icon;
/* prettier-ignore-end */
