// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type DiamondsSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DiamondsSvgIcon(props: DiamondsSvgIconProps) {
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
        d={
          "M7.098 12c.877.614 2.163 1.583 2.968 2.508.732.84 1.439 2.071 1.934 3.025.495-.954 1.202-2.185 1.935-3.025.805-.925 2.09-1.894 2.968-2.508-.878-.614-2.163-1.583-2.968-2.507-.733-.841-1.44-2.072-1.935-3.026-.495.954-1.202 2.185-1.934 3.026-.805.924-2.091 1.893-2.968 2.507zm1.836-3.493c1.174-1.348 2.369-4.033 2.38-4.06a.75.75 0 011.372 0c.012.027 1.206 2.712 2.38 4.06 1.145 1.317 3.559 2.843 3.584 2.858a.75.75 0 010 1.27c-.025.015-2.441 1.545-3.584 2.857-1.177 1.352-2.368 4.034-2.38 4.061a.75.75 0 01-1.372 0c-.011-.027-1.206-2.712-2.38-4.061-1.143-1.312-3.56-2.842-3.584-2.857a.753.753 0 010-1.27c.025-.015 2.44-1.544 3.584-2.858z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default DiamondsSvgIcon;
/* prettier-ignore-end */
