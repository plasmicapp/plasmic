/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ClockIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ClockIcon(props: ClockIconProps) {
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
          "M10 0A9.444 9.444 0 00.556 9.444h.016v9.445c0 .611.5 1.111 1.11 1.111h16.651c.612 0 1.112-.5 1.112-1.111V9.444A9.444 9.444 0 0010 0z"
        }
        fill={"#AAB8C2"}
      ></path>

      <path
        d={"M10 17.222a7.778 7.778 0 100-15.555 7.778 7.778 0 000 15.555z"}
        fill={"#fff"}
      ></path>

      <path
        d={
          "M10 2.222a7.222 7.222 0 110 14.444 7.222 7.222 0 010-14.444zm0-1.11c-4.595 0-8.333 3.737-8.333 8.332 0 4.595 3.738 8.334 8.333 8.334 4.595 0 8.334-3.739 8.334-8.334S14.595 1.111 10 1.111z"
        }
        fill={"#66757F"}
      ></path>

      <path
        d={
          "M10.555 3.333a.556.556 0 00-1.11 0v.556a.556.556 0 001.11 0v-.556zm0 11.667a.556.556 0 00-1.11 0v.556a.556.556 0 001.11 0V15zm-6.11-6.111h-.556a.556.556 0 000 1.111h.555a.556.556 0 000-1.111zm11.666 0h-.556a.556.556 0 000 1.111h.556a.556.556 0 000-1.111zm-1.274 4.607l-.393-.393a.555.555 0 10-.785.786l.392.393a.555.555 0 10.786-.786zm-9.282-.393l-.393.393a.555.555 0 10.786.786l.393-.393a.555.555 0 10-.786-.786zm-.393-7.71l.393.393A.555.555 0 106.341 5l-.393-.393a.555.555 0 10-.786.786zm9.282.393l.393-.393a.555.555 0 10-.786-.786L13.66 5a.555.555 0 10.785.786z"
        }
        fill={"#292F33"}
      ></path>

      <path
        d={
          "M4.953 7.688a.556.556 0 01.736-.716l4.53 1.95a.556.556 0 01-.44 1.021l-4.53-1.95a.556.556 0 01-.296-.305z"
        }
        fill={"#DD2E44"}
      ></path>
    </svg>
  );
}

export default ClockIcon;
/* prettier-ignore-end */
