import type FullCodeEditor from "@/wab/client/components/coding/FullCodeEditor";
import type { FullCodeEditorProps } from "@/wab/client/components/coding/FullCodeEditor";
import * as React from "react";

const _LazyFullCodeEditor = React.lazy(
  () => import("@/wab/client/components/coding/FullCodeEditor")
);

const LazyFullCodeEditor = React.forwardRef(
  (props: FullCodeEditorProps, ref: React.Ref<FullCodeEditor>) => (
    <React.Suspense fallback={<div />}>
      <_LazyFullCodeEditor ref={ref} {...props} />
    </React.Suspense>
  )
);

export default LazyFullCodeEditor;
