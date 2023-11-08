import * as React from "react";

/**
 * Acquire the props for a Component {T}
 */
export type PropsOf<T> = T extends (
  props: infer P
) => React.ReactElement<any> | null // Try to infer for SFCs
  ? P
  : T extends new (props: infer P) => React.Component // Otherwise try to infer for classes
  ? P
  : never;
