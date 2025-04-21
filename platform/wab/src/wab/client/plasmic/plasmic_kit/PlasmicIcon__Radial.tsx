/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type RadialIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function RadialIcon(props: RadialIconProps) {
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
          "M34 6a2 2 0 11-4 0 2 2 0 014 0zm6 26a8 8 0 11-16 0 8 8 0 0116 0zm-8 28a2 2 0 100-4 2 2 0 000 4zm-11.797-4.745a2 2 0 113.695 1.531 2 2 0 01-3.695-1.53zM42.715 6.131a2 2 0 10-1.53 3.696 2 2 0 001.53-3.696zm9.084 8.899a2 2 0 11-2.828-2.829 2 2 0 012.828 2.828zM12.201 51.799a2 2 0 102.828-2.829 2 2 0 00-2.828 2.829zm41.972-28.984a2 2 0 113.696-1.53 2 2 0 01-3.696 1.53zM7.214 40.101a2 2 0 101.53 3.696 2 2 0 00-1.53-3.696zM23.898 7.214a2 2 0 11-3.696 1.53 2 2 0 013.696-1.53zm16.204 49.572a2 2 0 103.695-1.53 2 2 0 00-3.695 1.53zM15.03 12.2a2 2 0 11-2.829 2.83 2 2 0 012.828-2.83zm36.769 39.599a2 2 0 10-2.829-2.829 2 2 0 002.83 2.83zm3.456-8.002a2 2 0 111.531-3.695 2 2 0 01-1.53 3.696zM6.131 21.285a2 2 0 103.696 1.53 2 2 0 00-3.696-1.53zM58 34a2 2 0 110-4 2 2 0 010 4zM4 32a2 2 0 104 0 2 2 0 00-4 0zm25.573-16.313a4 4 0 11-7.391 3.062 4 4 0 017.39-3.062zm10.081 34.791a4 4 0 10-3.062-7.391 4 4 0 003.062 7.39zM18.749 22.181a4 4 0 11-3.062 7.391 4 4 0 013.062-7.39zm26.502 19.637a4 4 0 103.062-7.391 4 4 0 00-3.062 7.391zm-29.564-7.391a4 4 0 113.062 7.39 4 4 0 01-3.062-7.39zm34.791-10.081a4 4 0 10-7.392 3.061 4 4 0 007.392-3.061zM22.181 45.25a4 4 0 117.392 3.062 4 4 0 01-7.392-3.061zm17.473-31.728a4 4 0 10-3.062 7.391 4 4 0 003.062-7.391z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default RadialIcon;
/* prettier-ignore-end */
