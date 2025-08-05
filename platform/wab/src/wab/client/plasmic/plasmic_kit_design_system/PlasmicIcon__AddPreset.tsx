/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type AddPresetIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AddPresetIcon(props: AddPresetIconProps) {
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
        d={
          "M14 12a2 2 0 114 0v24.341a6.003 6.003 0 010 11.318V52a2 2 0 11-4 0v-4.341a6.003 6.003 0 010-11.318V12zm16 4.341a6.003 6.003 0 000 11.318V32a2 2 0 104 0v-4.341a6.003 6.003 0 000-11.318V12a2 2 0 10-4 0v4.341zM44 32a2 2 0 00-2 2v8h-8a2 2 0 100 4h8v8a2 2 0 104 0v-8h8a2 2 0 100-4h-8v-8a2 2 0 00-2-2z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default AddPresetIcon;
/* prettier-ignore-end */
