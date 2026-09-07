import * as React from "react";

interface Focusable {
  focus(): void;
}

export function useAutoFocus(
  target: React.RefObject<Focusable | null> | false | null | undefined
) {
  React.useLayoutEffect(() => {
    if (target && target.current) {
      target.current.focus();
    }
  }, [target]);
}
