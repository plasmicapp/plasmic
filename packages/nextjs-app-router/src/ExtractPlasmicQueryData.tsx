import { plasmicPrepassExtract } from "@plasmicapp/prepass";
import type { HeadMetadata } from "@plasmicapp/query";
import * as React from "react";

/**
 * EXPERIMENTAL
 *
 * A component that serves the same purpose as extractPlasmicQueryData(), but from
 * React server components. This only works from frameworks that support
 * React.useId() and React.use() (like Next.js 13).
 *
 * The children of this component will be run through `extractPlasmicQueryData()`.
 */
export function ExtractPlasmicQueryData(props: { children?: React.ReactNode }) {
  const { children } = props;
  if (!("useId" in React) || !("use" in React)) {
    throw new Error(
      `You can only use <ExtractPlasmicQueryData /> from server components.`
    );
  }
  const scriptId = `plasmic-prefetch-${(React as any)["" + "useId"]()}`;
  if (typeof window === "undefined") {
    const {
      queryData,
      headMetadata,
    }: { queryData: Record<string, any>; headMetadata: HeadMetadata } = (
      React as any
    )["" + "use"](plasmicPrepassExtract(<>{children}</>));
    return (
      <>
        <script
          type="application/json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(queryData) }}
          data-plasmic-prefetch-id={scriptId}
          suppressHydrationWarning={true}
        />
        {headMetadata && (
          <script
            type="application/json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(headMetadata),
            }}
            data-plasmic-head-metadata-id={scriptId}
            suppressHydrationWarning={true}
          />
        )}
      </>
    );
  } else {
    return null;
  }
}
