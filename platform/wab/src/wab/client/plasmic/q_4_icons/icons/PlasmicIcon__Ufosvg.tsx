// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type UfosvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function UfosvgIcon(props: UfosvgIconProps) {
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
          "M6.855 10.408c-1.505 1.19-2.327 2.565-2.053 3.742.478 2.044 4.087 2.71 8.063 1.489 3.975-1.222 6.81-3.87 6.333-5.914-.24-1.03-1.274-1.71-2.749-1.975l-.5-.09m.801 10.09l1.5 1.5m-4.5-.5l.5.5m4.5-3.5l.5.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M10.5 4.9l-.525.143c-2.32.628-3.697 3.036-3.076 5.379l.144.54c.173.655.671 1.177 1.346 1.245.835.084 2.115.082 3.678-.341 1.572-.426 2.684-1.074 3.365-1.57.545-.395.714-1.09.541-1.741l-.145-.549c-.622-2.343-3.007-3.733-5.328-3.105z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default UfosvgIcon;
/* prettier-ignore-end */
