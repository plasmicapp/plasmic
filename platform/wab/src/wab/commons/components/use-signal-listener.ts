import { useEffect } from "react";
import { Signal } from "signals";

export function useSignalListener<T>(
  signal: Signal<T>,
  listener: (args: T) => void,
  deps: any[] = []
) {
  return useEffect(() => {
    signal.add(listener);
    return () => {
      signal.remove(listener);
    };
  }, deps);
}
