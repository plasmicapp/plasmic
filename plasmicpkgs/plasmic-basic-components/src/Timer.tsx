import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { useEffect, useMemo, useRef } from "react";
import { useIsomorphicLayoutEffect } from "./common";

export interface TimerProps {
  onTick: () => void;
  isRunning?: boolean;
  intervalSeconds?: number;
  runWhileEditing: boolean;
  "data-plasmic-canvas-envs"?: number;
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

export function Timer({
  intervalSeconds = 1,
  isRunning = false,
  onTick = () => {},
  runWhileEditing,
  "data-plasmic-canvas-envs": canvasId,
}: TimerProps) {
  const isEditMode = useMemo(() => canvasId !== undefined, [canvasId]);
  useInterval(
    onTick,
    // Delay in milliseconds or null to stop it
    isRunning && (isEditMode ? runWhileEditing : true)
      ? intervalSeconds * 1000
      : null
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
      displayName: "Run this every interval",
      description: "Actions to run periodically",
      argTypes: [],
    },
    isRunning: {
      type: "boolean",
      displayName: "Is Running?",
      defaultValue: true,
    },
    runWhileEditing: {
      type: "boolean",
      displayName: "Run while editing",
      description:
        "Normally this only runs in the live site or in preview mode, but you can force it to run even while you are editing in the canvas (Please enable interactive mode to observe state changes)",
      defaultValue: false,
    },
    intervalSeconds: {
      type: "number",
      displayName: "Interval (seconds)",
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
