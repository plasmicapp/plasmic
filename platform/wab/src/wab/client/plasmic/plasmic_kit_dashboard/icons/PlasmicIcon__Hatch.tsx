/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type HatchIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function HatchIcon(props: HatchIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 20 20"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M1.527 10.74l1.25-1.851 1.667 1.667 2.222-1.112 1.667 1.667 2.222-3.333 2.222 1.666 1.667-.555 1.111 1.667 1.667-1.667 1.11 2.222L17.223 15l-6.111 2.778L5 16.667l-3.334-3.334-.139-2.592z"
        }
        fill={"#99AAB5"}
      ></path>

      <path
        d={
          "M16.642 8.173c.012-.16.024-.319.024-.48a6.662 6.662 0 00-5.553-6.567c.66-.144 1.128-.283.553-.57-.62-.31-1.239.071-1.666.47-.428-.399-1.047-.78-1.667-.47-.575.287-.107.426.553.57a6.663 6.663 0 00-5.553 6.566c0 .162.013.322.024.482C3.09 11.84-.144 17.222 10 17.222c10.143 0 6.91-5.381 6.642-9.049z"
        }
        fill={"#FFCC4D"}
      ></path>

      <path
        d={
          "M11.666 7.778c0 .92-.746 1.11-1.666 1.11-.92 0-1.667-.19-1.667-1.11a1.667 1.667 0 113.333 0z"
        }
        fill={"#F4900C"}
      ></path>

      <path
        d={
          "M6.389 7.222a.833.833 0 100-1.666.833.833 0 000 1.666zm7.221 0a.833.833 0 100-1.666.833.833 0 000 1.666z"
        }
        fill={"#662113"}
      ></path>

      <path
        d={
          "M17.222 13.889l-1.666-.556-2.222 3.334-1.667-2.778L10.556 15l-2.222-1.111-1.667 2.222L5 12.778l-1.666 1.11-1.83-4.313a7.366 7.366 0 00-.393 2.37c0 4.449 3.98 8.055 8.89 8.055 4.908 0 8.888-3.606 8.888-8.056 0-.69-.106-1.357-.287-1.998l-1.38 3.943z"
        }
        fill={"#E1E8ED"}
      ></path>
    </svg>
  );
}

export default HatchIcon;
/* prettier-ignore-end */
