import { Component } from "@/wab/shared/model/classes";

/**
 * React context value passed down from super component ancestors in the React tree
 */
export interface SuperContextValue {
  /**
   * Frames of super context are ordered from ancestor-most to leaf-most
   */
  frames: SuperContextFrame[];
}

/**
 * A "frame" of the super component context, representing an instantiation of
 * a super component instance somewhere above the React tree
 */
export interface SuperContextFrame {
  /** Key of the ValComponent */
  key: string;

  /** The super component */
  component: Component;
}

/**
 * Appends a new SuperContextFrame to a SuperContextValue
 */
export function addSuperContextFrame(
  context: SuperContextValue | undefined,
  frame: SuperContextFrame
): SuperContextValue {
  return {
    frames: [...(context?.frames ?? []), frame],
  };
}
