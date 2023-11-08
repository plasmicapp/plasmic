// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ComponentsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ComponentsvgIcon(props: ComponentsvgIconProps) {
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
          "M10.606 6.61a10.53 10.53 0 00-1.58-.687c-1.75-.583-2.678-.292-3.036.067-.358.358-.65 1.285-.067 3.036.168.502.397 1.033.686 1.58a19.477 19.477 0 011.856-2.142 19.478 19.478 0 012.141-1.855zM12 5.673c-2.898-1.737-5.687-2.13-7.07-.745-1.385 1.384-.993 4.173.744 7.071-1.737 2.898-2.129 5.687-.745 7.071 1.384 1.384 4.173.992 7.071-.745 2.898 1.737 5.687 2.13 7.071.745 1.384-1.384.992-4.173-.745-7.071 1.737-2.898 2.13-5.687.745-7.071-1.384-1.384-4.173-.992-7.07.745zm0 1.782a17.632 17.632 0 00-2.475 2.07 17.601 17.601 0 00-2.069 2.474c.568.827 1.26 1.665 2.07 2.475A17.63 17.63 0 0012 16.544a17.632 17.632 0 002.475-2.07A17.533 17.533 0 0016.544 12a17.631 17.631 0 00-2.069-2.475A17.634 17.634 0 0012 7.456zm5.39 3.15a19.465 19.465 0 00-1.854-2.142 19.472 19.472 0 00-2.142-1.855c.547-.29 1.079-.519 1.58-.686 1.75-.583 2.678-.292 3.037.067.358.358.65 1.285.066 3.036a10.526 10.526 0 01-.686 1.58zm0 2.788a19.46 19.46 0 01-1.854 2.142 19.47 19.47 0 01-2.142 1.855c.547.29 1.079.519 1.58.686 1.75.583 2.678.291 3.037-.067.358-.358.65-1.285.066-3.036a10.529 10.529 0 00-.686-1.58zm-6.784 3.997a19.477 19.477 0 01-2.141-1.855 19.48 19.48 0 01-1.856-2.142 10.628 10.628 0 00-.686 1.58c-.583 1.75-.291 2.678.067 3.036.358.358 1.286.65 3.036.067a10.536 10.536 0 001.58-.686z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default ComponentsvgIcon;
/* prettier-ignore-end */
