import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { useEffect, useRef } from "react";
import { useIsomorphicLayoutEffect } from "./common";

export interface TimerProps {
  onTick: () => void;
  isRunning?: boolean;
  intervalSeconds?: number;
}

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  // Remember the latest callback if it changes.
  useIsomorphicLayoutEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    // Don't schedule if no delay is specified.
    // Note: 0 is a valid value for delay.
    if (!delay && delay !== 0) {
      return;
    }

    const id = setInterval(() => savedCallback.current(), delay);

    return () => clearInterval(id);
  }, [delay]);
}

export default function Timer({
  intervalSeconds = 1,
  isRunning = false,
  onTick = () => {},
}: TimerProps) {
  useInterval(
    onTick,
    // Delay in milliseconds or null to stop it
    isRunning ? intervalSeconds * 1000 : null
  );
  return null;
}

export const timerMeta: CodeComponentMeta<TimerProps> = {
  name: "hostless-timer",
  displayName: "Timer",
  description: "Run something periodically",
  importName: "Timer",
  importPath: "@plasmicpkgs/plasmic-basic-components",
  props: {
    onTick: {
      type: "eventHandler",
      displayName: "Run periodically",
      description: "Actions to run periodically",
      argTypes: [],
    },
    isRunning: {
      type: "boolean",
      displayName: "Is Running?",
    },
    intervalSeconds: {
      type: "number",
      displayName: "Seconds",
      description: "Interval in seconds",
    },
  },
};

export function registerTimer(
  loader?: { registerComponent: typeof registerComponent },
  customMeta?: CodeComponentMeta<TimerProps>
) {
  if (loader) {
    loader.registerComponent(Timer, customMeta ?? timerMeta);
  } else {
    registerComponent(Timer, customMeta ?? timerMeta);
  }
}
