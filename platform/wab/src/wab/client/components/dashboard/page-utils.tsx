import * as React from "react";
import { Helmet } from "react-helmet";

export function documentTitle(title: string) {
  return (
    // @ts-ignore
    <Helmet>
      <title>{title ? `${title} - Plasmic` : `Plasmic`}</title>
    </Helmet>
  );
}
