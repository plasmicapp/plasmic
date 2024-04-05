import { extractPlasmicQueryData } from "@plasmicapp/prepass";
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
  if (!React.useId || !(React as any).use) {
    throw new Error(
      `You can only use <ExtractPlasmicQueryData /> from server components.`
    );
  }
  const scriptId = `plasmic-prefetch-${React.useId()}`;
  if (typeof window === "undefined") {
    const data: Record<string, any> = (React as any).use(
      extractPlasmicQueryData(<>{children}</>)
    );
    return (
      <>
        <script
          type="application/json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
          data-plasmic-prefetch-id={scriptId}
          suppressHydrationWarning={true}
        />
      </>
    );
  } else {
    return null;
  }
}
