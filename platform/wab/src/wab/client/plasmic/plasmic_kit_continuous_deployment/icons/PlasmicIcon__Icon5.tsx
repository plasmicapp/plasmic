// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon5IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon5Icon(props: Icon5IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 64 64"}
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
          "M38.414 15.586a2 2 0 010 2.828L24.828 32l13.586 13.586a2 2 0 11-2.828 2.828L19.172 32l16.414-16.414a2 2 0 012.828 0z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default Icon5Icon;
/* prettier-ignore-end */
