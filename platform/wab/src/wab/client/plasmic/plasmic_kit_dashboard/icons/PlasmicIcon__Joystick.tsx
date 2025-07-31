/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type JoystickIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function JoystickIcon(props: JoystickIconProps) {
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

      <path d={"M8.889 5h2.222v9.444H8.889V5z"} fill={"#99AAB5"}></path>

      <path
        d={
          "M5.556 13.611c0 .46-.373.833-.833.833H3.056a.834.834 0 010-1.666h1.667c.46 0 .833.373.833.833z"
        }
        fill={"#DA2F47"}
      ></path>

      <path
        d={
          "M18.89 18.333c0 .614-.499 1.111-1.112 1.111H2.222a1.111 1.111 0 01-1.11-1.11V15a1.11 1.11 0 011.11-1.111h15.556c.613 0 1.111.498 1.111 1.111v3.333z"
        }
        fill={"#31373D"}
      ></path>

      <path
        d={
          "M5.556 19.167c0 .46-.373.833-.833.833H3.056a.833.833 0 110-1.667h1.667c.46 0 .833.374.833.834zm12.222 0c0 .46-.373.833-.833.833h-1.667a.834.834 0 010-1.667h1.667c.46 0 .833.374.833.834z"
        }
        fill={"#31373D"}
      ></path>

      <path
        d={"M10 6.667a2.778 2.778 0 100-5.556 2.778 2.778 0 000 5.556z"}
        fill={"#DA2F47"}
      ></path>

      <path
        d={
          "M13.89 14.444c0 .614-.499 1.112-1.112 1.112H7.222a1.112 1.112 0 01-1.11-1.112v-.555c0-.613 2.164-3.333 2.777-3.333h2.222c.614 0 2.778 2.72 2.778 3.333v.555z"
        }
        fill={"#31373D"}
      ></path>

      <path
        d={
          "M18.334 15.556a.555.555 0 01-.556.555H2.223a.555.555 0 110-1.111h15.555c.307 0 .556.248.556.556z"
        }
        fill={"#66757F"}
      ></path>
    </svg>
  );
}

export default JoystickIcon;
/* prettier-ignore-end */
