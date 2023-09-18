import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React from "react";

export interface SideEffectProps {
  onMount?: () => Promise<void>;
  onUnmount?: () => Promise<void>;
  deps?: unknown[];
}

export default function SideEffect({
  deps,
  onMount,
  onUnmount,
}: SideEffectProps) {
  React.useEffect(() => {
    onMount?.();
    return () => {
      onUnmount?.();
    };
  }, deps ?? []);
  return null;
}

export const sideEffectMeta: CodeComponentMeta<SideEffectProps> = {
  name: "hostless-side-effect",
  displayName: "Side Effect",
  description: "Run actions on component mount/unmount.",
  importName: "SideEffect",
  importPath: "@plasmicpkgs/plasmic-basic-components",
  props: {
    onMount: {
      type: "eventHandler",
      displayName: "On mount",
      description: "Actions to run when the component is mounted.",
      argTypes: [],
    },
    onUnmount: {
      type: "eventHandler",
      displayName: "On unmount",
      description: "Actions to run when the component is unmounted.",
      argTypes: [],
    },
    deps: {
      type: "array",
      displayName: "Dependencies",
      description:
        "List of reactive values which should trigger a re-run of the actions if changed.",
    },
  },
};

export function registerSideEffect(
  loader?: { registerComponent: typeof registerComponent },
  customMeta?: CodeComponentMeta<SideEffectProps>
) {
  if (loader) {
    loader.registerComponent(SideEffect, customMeta ?? sideEffectMeta);
  } else {
    registerComponent(SideEffect, customMeta ?? sideEffectMeta);
  }
}
