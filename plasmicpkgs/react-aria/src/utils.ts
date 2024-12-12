import {
  usePlasmicCanvasComponentInfo,
  usePlasmicCanvasContext,
  type CodeComponentMeta,
} from "@plasmicapp/host";
import registerComponent from "@plasmicapp/host/registerComponent";
import React, { useEffect } from "react";

export type HasControlContextData<T = BaseControlContextData> = {
  setControlContextData?: (ctxData: T) => void;
};

export type BaseControlContextData = {
  parent?: {
    isDisabled?: boolean;
    isReadOnly?: boolean;
  };
};

export type Registerable = {
  registerComponent: typeof registerComponent;
};

export type OtherCodeComponentsMeta = {
  text: CodeComponentMeta<any>;
  description: CodeComponentMeta<any>;
};

export type CodeComponentMetaOverrides<T extends React.ComponentType<any>> =
  Partial<
    Pick<
      CodeComponentMeta<React.ComponentProps<T>>,
      "parentComponentName" | "props" | "displayName" | "name"
    >
  >;

export function useAutoOpen({
  props,
  open,
  close,
}: {
  props: any;
  open?: () => void;
  close?: () => void;
}) {
  const inPlasmicCanvas = !!usePlasmicCanvasContext();
  const isSelected =
    usePlasmicCanvasComponentInfo?.(props)?.isSelected ?? false;

  useEffect(() => {
    // selection in outline tab only matters in canvas
    if (!inPlasmicCanvas) {
      return;
    }
    if (isSelected) {
      open?.();
    } else {
      close?.();
    }
    // Not putting open and close in the useEffect dependencies array, because it causes a re-render loop.
  }, [isSelected, inPlasmicCanvas]);
}

export function registerComponentHelper<T extends React.ComponentType<any>>(
  loader: Registerable | undefined,
  component: T,
  meta: CodeComponentMeta<React.ComponentProps<T>>,
  overrides?: CodeComponentMetaOverrides<T>
) {
  if (overrides) {
    meta = {
      ...meta,
      ...overrides,
      props: {
        ...meta.props,
        ...overrides.props,
      },
    };
    if (overrides.parentComponentName) {
      meta.name = makeChildComponentName(
        overrides.parentComponentName,
        meta.name
      );
    }
  }
  if (loader) {
    loader.registerComponent(component, meta);
  } else {
    registerComponent(component, meta);
  }
  return meta;
}

export function makeComponentName(name: string) {
  return `plasmic-react-aria-${name}`;
}

export function makeChildComponentName(
  fullParentName: string | undefined,
  fullChildName: string
) {
  if (!fullParentName) {
    return fullChildName;
  }
  return `${fullParentName}-${fullChildName.replace(
    "plasmic-react-aria-",
    ""
  )}`;
}

export interface Styleable {
  className?: string;
  style?: React.CSSProperties;
}

export function extractPlasmicDataProps(props: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(props).filter(([key]) => key.startsWith("data-plasmic-"))
  );
}

export function withoutNils<T>(array: (T | undefined | null)[]) {
  return array.filter((x): x is T => x != null);
}

export function isDefined<T>(thing: T | undefined | null): thing is T {
  return thing !== undefined && thing !== null;
}
