// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type InputFieldSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function InputFieldSvgIcon(props: InputFieldSvgIconProps) {
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
          "M10.75 4a.75.75 0 000 1.5h.5v13h-.5a.75.75 0 000 1.5h2.5a.75.75 0 000-1.5h-.5v-13h.5a.75.75 0 000-1.5h-2.5zM5.5 9.75c0-.69.56-1.25 1.25-1.25h1.5a.75.75 0 000-1.5h-1.5A2.75 2.75 0 004 9.75v4.5A2.75 2.75 0 006.75 17h1.5a.75.75 0 000-1.5h-1.5c-.69 0-1.25-.56-1.25-1.25v-4.5zM15.75 7a.75.75 0 000 1.5h1.5c.69 0 1.25.56 1.25 1.25v4.5c0 .69-.56 1.25-1.25 1.25h-1.5a.75.75 0 000 1.5h1.5A2.75 2.75 0 0020 14.25v-4.5A2.75 2.75 0 0017.25 7h-1.5z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default InputFieldSvgIcon;
/* prettier-ignore-end */
