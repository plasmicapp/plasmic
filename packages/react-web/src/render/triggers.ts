import {
  FocusRingAria,
  useFocusRing as useAriaFocusRing,
} from "@react-aria/focus";
import {
  HoverResult,
  PressResult,
  useHover as useAriaHover,
  usePress as useAriaPress,
} from "@react-aria/interactions";

import * as React from "react";

type FocusHookResult = [boolean, FocusRingAria["focusProps"]];
type HoverHookResult = [boolean, HoverResult["hoverProps"]];
type PressHookResult = [boolean, PressResult["pressProps"]];

function useFocused(opts: { isTextInput?: boolean }): FocusHookResult {
  const { isFocused, focusProps } = useAriaFocusRing({
    within: false,
    isTextInput: opts.isTextInput,
  });

  return [isFocused, focusProps];
}

function useFocusVisible(opts: { isTextInput?: boolean }): FocusHookResult {
  const { isFocusVisible, focusProps } = useAriaFocusRing({
    within: false,
    isTextInput: opts.isTextInput,
  });

  return [isFocusVisible, focusProps];
}

function useFocusedWithin(opts: { isTextInput?: boolean }): FocusHookResult {
  const { isFocused, focusProps } = useAriaFocusRing({
    within: true,
    isTextInput: opts.isTextInput,
  });

  return [isFocused, focusProps];
}

function useFocusVisibleWithin(opts: {
  isTextInput?: boolean;
}): FocusHookResult {
  const { isFocusVisible, focusProps } = useAriaFocusRing({
    within: true,
    isTextInput: opts.isTextInput,
  });

  return [isFocusVisible, focusProps];
}

function useHover(): HoverHookResult {
  const { isHovered, hoverProps } = useAriaHover({});
  return [isHovered, hoverProps];
}

function usePressed(): PressHookResult {
  const { isPressed, pressProps } = useAriaPress({
    onPress: (e) => e.continuePropagation(),
    onPressStart: (e) => e.continuePropagation(),
    onPressEnd: (e) => e.continuePropagation(),
    onPressUp: (e) => e.continuePropagation(),
  });
  return [isPressed, pressProps];
}

const TRIGGER_TO_HOOK = {
  useHover,
  useFocused,
  useFocusVisible,
  useFocusedWithin,
  useFocusVisibleWithin,
  usePressed,
} as const;

type TriggerType = keyof typeof TRIGGER_TO_HOOK;

interface TriggerOpts {
  isTextInput?: boolean;
}

/**
 * Installs argment trigger. All the useTrigger calls must use hardcoded `trigger` arg,
 * as it's not valid to install variable React hooks!
 */
export function useTrigger(trigger: TriggerType, opts: TriggerOpts) {
  return TRIGGER_TO_HOOK[trigger](opts) as [
    boolean,
    React.HTMLAttributes<HTMLElement>
  ];
}
