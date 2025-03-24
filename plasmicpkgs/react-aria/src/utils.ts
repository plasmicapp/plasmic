import {
  usePlasmicCanvasComponentInfo,
  usePlasmicCanvasContext,
  type CodeComponentMeta,
} from "@plasmicapp/host";
import registerComponent from "@plasmicapp/host/registerComponent";
import React, { useEffect } from "react";
import { InputProps, TextAreaProps } from "react-aria-components";

export type HasControlContextData<T = BaseControlContextData> = {
  setControlContextData?: (ctxData: T) => void;
};

export type WithPlasmicCanvasComponentInfo = {
  __plasmic_selection_prop__?: {
    isSelected: boolean;
    selectedSlotName?: string;
  };
};

export type ControlContextData = {
  isDisabled?: boolean;
  isReadOnly?: boolean;
};

export type BaseControlContextData = {
  parent?: ControlContextData;
};

export type BaseControlContextDataForLists = {
  itemIds: string[];
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

/**
 * This hook determines whether an overlay should be open or not. Unlike `useAutoOpen`, it does not perform any actions.
 * It takes into account the following:
 * 1. Whether the overlay is in canvas or preview.
 * 2. Whether the overlay is selected on canvas
 * 3. Whether the overlay's trigger slot is selected on canvas
 */
export function useIsOpen({
  triggerSlotName,
  isOpen,
  __plasmic_selection_prop__,
}: {
  __plasmic_selection_prop__: WithPlasmicCanvasComponentInfo["__plasmic_selection_prop__"];
  triggerSlotName?: string;
  isOpen?: boolean;
}) {
  const canvasContext = usePlasmicCanvasContext();
  const { isSelected, selectedSlotName } =
    usePlasmicCanvasComponentInfo?.({ __plasmic_selection_prop__ }) ?? {};

  // In preview, just use the isOpen prop as is.
  if (!canvasContext) {
    return isOpen;
  }

  // In canvas, override the isOpen prop if the element is selected.
  const isTriggerSlotSelected =
    isDefined(selectedSlotName) && selectedSlotName === triggerSlotName;

  const isAutoOpenedBySelection = isSelected && !isTriggerSlotSelected;

  // Component should always be controlled in canvas
  return Boolean(isAutoOpenedBySelection || isOpen);
}

/**
 * This hook is used to perform open/close actions on an overlay. It takes into account the following:
 * 1. Whether the overlay is in canvas or preview.
 * 2. Whether the overlay is selected on canvas
 */
export function useAutoOpen({
  props,
  open,
  close,
}: {
  props: WithPlasmicCanvasComponentInfo;
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
  }, [isSelected, inPlasmicCanvas, open, close]);
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

export function filterHoverProps<T extends TextAreaProps | InputProps>(
  props: T
) {
  const {
    onHoverStart: _onHoverStart,
    onHoverChange: _onHoverChange,
    onHoverEnd: _onHoverEnd,
    ...otherProps
  } = props;
  return otherProps;
}
