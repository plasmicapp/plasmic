// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ChecksvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ChecksvgIcon(props: ChecksvgIconProps) {
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
          "M18.416 5.876a.75.75 0 01.208 1.04L11.42 17.721a1.75 1.75 0 01-2.871.06l-3.156-4.34a.75.75 0 111.214-.882l3.155 4.339a.25.25 0 00.41-.009l7.204-10.805a.75.75 0 011.04-.208z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default ChecksvgIcon;
/* prettier-ignore-end */
