import React from "react";

export function useForceUpdate(react = React) {
  const [, setTick] = react.useState(0);
  const update = react.useCallback(() => {
    setTick((tick) => tick + 1);
  }, []);
  return update;
}
