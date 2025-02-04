import { usePlasmicCanvasContext } from "@plasmicapp/loader-nextjs";
import React from "react";

export interface RedirectIfProps {
  children?: any;
  className?: string;
  condition?: any;
  onFalse?: () => void;
}

export function RedirectIf(props: RedirectIfProps) {
  const { children, className, onFalse, condition } = props;
  const inEditor = usePlasmicCanvasContext();

  React.useEffect(() => {
    if (inEditor || !onFalse || condition) {
      return;
    }
    onFalse();
  }, [condition, inEditor]);

  // Validation
  if (typeof condition === "undefined") {
    return (
      <p>
        Condition needs to be a boolean prop. Try to add exclamation marks to
        the value.
      </p>
    );
  }

  return <div className={className}>{children}</div>;
}
