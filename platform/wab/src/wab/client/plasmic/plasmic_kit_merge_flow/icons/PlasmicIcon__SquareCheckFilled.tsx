// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SquareCheckFilledIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SquareCheckFilledIcon(props: SquareCheckFilledIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 20 20"}
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
          "M5.625 3.333a2.292 2.292 0 00-2.292 2.292v8.75a2.292 2.292 0 002.292 2.292h8.75a2.292 2.292 0 002.292-2.292v-8.75a2.292 2.292 0 00-2.292-2.292h-8.75zm7.538 5.221a.625.625 0 00-.909-.858l-3.1 3.282-1.42-1.42a.625.625 0 00-.884.884l1.875 1.875a.625.625 0 00.896-.013l3.542-3.75z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default SquareCheckFilledIcon;
/* prettier-ignore-end */
