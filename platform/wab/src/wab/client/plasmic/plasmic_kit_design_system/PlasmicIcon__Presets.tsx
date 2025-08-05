/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type PresetsIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PresetsIcon(props: PresetsIconProps) {
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
          "M16 10a2 2 0 00-2 2v24.341a6.003 6.003 0 000 11.318V52a2 2 0 104 0v-4.341a6.003 6.003 0 000-11.318V12a2 2 0 00-2-2zm18 2v4.341a6.003 6.003 0 010 11.318V52a2 2 0 11-4 0V27.659a6.003 6.003 0 010-11.318V12a2 2 0 114 0zm16 14.341V12a2 2 0 10-4 0v14.341a6.003 6.003 0 000 11.318V52a2 2 0 104 0V37.659a6.003 6.003 0 000-11.318z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default PresetsIcon;
/* prettier-ignore-end */
