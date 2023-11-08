// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Settings2IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Settings2Icon(props: Settings2IconProps) {
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
          "M13.3 19.6c.3.3.7.4 1.1.4.3 0 .5-.1.6-.2l.8-.4c.6-.3.9-.9.9-1.5l-.1-1.1c0-.4.3-.8.7-.9l1.1-.2c.7-.1 1.2-.6 1.3-1.2l.2-.9c.2-.6-.1-1.2-.6-1.6l-.9-.6c-.4-.3-.5-.8-.3-1.2l.6-1c.3-.6.3-1.2-.1-1.8l-.6-.7c-.4-.5-1-.7-1.6-.5l-1.1.3c-.4.1-.8-.1-1-.5l-.5-1c-.2-.6-.8-1-1.4-1h-.9c-.6 0-1.2.4-1.4 1l-.4 1c-.2.4-.6.6-1 .5l-1.1-.3C7 6 6.3 6.2 6 6.8l-.6.7c-.4.5-.5 1.1-.2 1.7l.6 1c.3.4.2.9-.2 1.2l-.9.6c-.6.3-.8 1-.7 1.6l.2 1c.2.6.7 1.1 1.3 1.2l1.1.2c.4.1.7.5.7.9L7.2 18c0 .6.3 1.2.9 1.5l.8.4c.5.2 1.2.1 1.7-.3l.8-.8c.3-.3.8-.3 1.1 0l.8.8zM6.6 8.4l.6-.8 1.1.4c1.1.3 2.4-.3 2.8-1.4l.4-1.1h.9l.4 1.1c.5 1.2 1.7 1.8 2.9 1.4l1.1-.3.6.8-.6 1c-.6 1.1-.3 2.4.7 3.1l.9.7-.2.9-1.1.2c-1.2.2-2.1 1.3-2 2.5l.1 1.2-.8.4-.8-.8c-.9-.8-2.3-.8-3.2 0l-.9.8-.8-.5.2-1.1c.1-1.2-.8-2.3-2-2.5l-1.1-.2-.2-1 .9-.6c1-.7 1.3-2 .7-3.1l-.6-1.1zm4.34 2.54a1.5 1.5 0 112.12 2.121 1.5 1.5 0 01-2.12-2.122zm3.181-1.061a3 3 0 10-4.242 4.243A3 3 0 0014.12 9.88z"
        }
        fill={"currentColor"}
        fillOpacity={".923"}
      ></path>
    </svg>
  );
}

export default Settings2Icon;
/* prettier-ignore-end */
