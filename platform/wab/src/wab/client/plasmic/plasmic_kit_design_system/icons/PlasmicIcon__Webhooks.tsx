/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type WebhooksIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WebhooksIcon(props: WebhooksIconProps) {
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
          "M29.021 38.022v-4.983a1.027 1.027 0 00-1.622-.819l-9.975 6.989a1 1 0 000 1.638l9.975 6.989a1.027 1.027 0 001.622-.82v-4.994h23.58a.754.754 0 01.66 1.111C47.13 54.877 32.64 59.43 20.897 53.3A23.986 23.986 0 018.01 32.022a23.51 23.51 0 01.557-5.037 1.244 1.244 0 011.221-.963H35v4.982a1.027 1.027 0 001.622.819l9.974-6.989a1 1 0 000-1.638l-9.974-6.989a1.027 1.027 0 00-1.622.82v4.994H11.42a.754.754 0 01-.66-1.111C16.89 9.166 31.379 4.615 43.123 10.745A23.986 23.986 0 0156.01 32.022a23.566 23.566 0 01-.557 5.035 1.244 1.244 0 01-1.221.964H29.021z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default WebhooksIcon;
/* prettier-ignore-end */
