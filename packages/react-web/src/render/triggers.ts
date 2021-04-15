import { useFocusRing as useAriaFocusRing } from "@react-aria/focus";
import * as React from "react";

function useFocused(opts: { isTextInput?: boolean }) {
  const { isFocused, focusProps } = useAriaFocusRing({
    within: false,
    isTextInput: opts.isTextInput,
  });

  return [isFocused, focusProps];
}

function useFocusVisible(opts: { isTextInput?: boolean }) {
  const { isFocusVisible, focusProps } = useAriaFocusRing({
    within: false,
    isTextInput: opts.isTextInput,
  });

  return [isFocusVisible, focusProps];
}

function useFocusedWithin(opts: { isTextInput?: boolean }) {
  const { isFocused, focusProps } = useAriaFocusRing({
    within: true,
    isTextInput: opts.isTextInput,
  });

  return [isFocused, focusProps];
}

function useFocusVisibleWithin(opts: { isTextInput?: boolean }) {
  const { isFocusVisible, focusProps } = useAriaFocusRing({
    within: true,
    isTextInput: opts.isTextInput,
  });

  return [isFocusVisible, focusProps];
}

function useHover() {
  const [isHover, setHover] = React.useState(false);
  return [
    isHover,
    {
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
    },
  ];
}

function usePressed() {
  const [isPressed, setPressed] = React.useState(false);
  return [
    isPressed,
    {
      onMouseDown: () => setPressed(true),
      onMouseUp: () => setPressed(false),
    },
  ];
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
