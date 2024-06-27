import { cx, filterFalsy, spawn, tuple, withoutNils } from "@/wab/shared/common";
import { ReadablePromise } from "@/wab/commons/control";
import { assignIn, groupBy, isFunction, isNil } from "lodash";
import React, { SyntheticEvent, useState } from "react";

export interface KeyModifiers {
  alt?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
}

/**
 * Calls argumnet EventHandlers with the argument event.  Handlers are
 * invoked in the order given.
 *
 * @param stopPropagation if true (default), then once some handler
 * has stopped event propagation (by calling event.stopPropagation()),
 * the rest of the handlers are not invoked.
 */
export function callEventHandlers<E extends SyntheticEvent<any>>(
  event: E,
  handlers: (React.EventHandler<E> | undefined)[],
  stopPropagation: boolean = true
) {
  for (const handler of handlers) {
    if (stopPropagation && event.isPropagationStopped()) {
      return;
    }
    if (handler) {
      handler(event);
    }
  }
}

export function swallowClick(event: React.MouseEvent<any>) {
  event.stopPropagation();
}

export const swallowingClick =
  <T extends HTMLElement>(f?: (event: React.MouseEvent<T>) => void) =>
  (event: React.MouseEvent<T>) => {
    event.stopPropagation();
    if (f) {
      f(event);
    }
  };

export function joinReactNodes(
  elements: ReadonlyArray<React.ReactNode>,
  separator: React.ReactNode
) {
  const res: React.ReactNode[] = [];
  for (let i = 0; i < elements.length; i++) {
    if (i !== 0) {
      res.push(
        React.isValidElement(separator)
          ? React.cloneElement(separator, { key: `s${i}` })
          : separator
      );
    }
    const element = elements[i];
    res.push(element);
  }
  return <>{res}</>;
}

export function updateRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (!ref) {
    return;
  }

  if (isFunction(ref)) {
    ref(value);
  } else {
    (ref as any).current = value;
  }
}

export function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (value: T) => {
    for (const ref of refs) {
      updateRef(ref, value);
    }
  };
}

/**
 * Hook for when you're writing a component that where you want to both
 * forwardRef, _and_ make use of the ref yourself in your component.
 * For example,
 *
 * const Button = forwardRef(function(props, outerRef) {
 *   const {ref, onRef} = useForwardedRef(outerRef);
 *   React.useEffect(() => {
 *     // Can make use of ref.current here
 *   });
 *   return <button ref={onRef} />;
 * });
 * @param ref
 */
export function useForwardedRef<T>(ref: React.Ref<T>) {
  const onRef = React.useCallback(
    (x: T) => {
      updateRef(ref, x);
      ensuredRef.current = x;
    },
    [ref]
  );

  const ensuredRef = React.useRef<T | null>(null);
  return { ref: ensuredRef, onRef };
}

export function createFakeEvent<T extends React.SyntheticEvent>(
  base: React.SyntheticEvent,
  target: HTMLElement
) {
  const event = Object.create(base);
  event.target = target;
  event.currentTarget = target;
  return event as T;
}

export function MaybeWrap(props: {
  children: React.ReactNode;
  cond: boolean;
  wrapper: (children: React.ReactNode) => React.ReactElement;
}) {
  return (
    props.cond ? props.wrapper(props.children) : props.children
  ) as React.ReactElement;
}

/**
 * Returns some value that will be a constant for the lifetime of a
 * Component.  This is basically the same as doing React.useRef,
 * except it takes in a initialization function instead of an instance.
 * That makes it suitable for things that are expensive to instantiate,
 * like a ResizeObserver.
 */
export function useConstant<T>(fn: () => T): T {
  const ref = React.useRef<{ v: T }>();

  if (!ref.current) {
    ref.current = { v: fn() };
  }

  return ref.current.v;
}

/**
 * Wraps a function so that it will be called after timeout.  Multiple
 * invocations of the function will only lead to a single invocation.
 */
export function useBatchedDelayed(fn: () => void) {
  const timerRef = React.useRef<any | undefined>(undefined);
  React.useEffect(() => {
    return () => {
      // If we're getting unmounted, clear the timeout
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [timerRef]);
  const wrapped = React.useCallback(() => {
    if (!timerRef.current) {
      // only schedule timeout if there hasn't been one scheduled yet
      timerRef.current = setTimeout(() => {
        // make sure we're still mounted
        if (timerRef.current) {
          fn();
          timerRef.current = undefined;
        }
      }, 1);
    }
  }, [timerRef, fn]);
  return wrapped;
}

export function nullIfEmpty(nodes: React.ReactNode): React.ReactNode {
  if (Array.isArray(nodes)) {
    const filteredNodes = filterFalsy(nodes.map((x) => nullIfEmpty(x)));
    return filteredNodes.length === 0
      ? null
      : React.createElement(React.Fragment, {}, ...filteredNodes);
  } else if (React.isValidElement(nodes) && nodes.type === React.Fragment) {
    return nullIfEmpty(nodes.props.children);
  } else {
    return nodes;
  }
}

export function useChanged<T>(val: T, onChange: (val: T) => void) {
  const ref = React.useRef(val);
  React.useEffect(() => {
    if (ref.current !== val) {
      ref.current = val;
      onChange(val);
    }
  }, [val, onChange]);
}

export function combineProps(...propss: { [prop: string]: any }[]) {
  const mergedHandlers = Object.fromEntries(
    Object.entries(
      groupBy(
        propss.flatMap((props) =>
          Object.entries(props).map(([prop, val]) => ({ prop, val }))
        ),
        ({ prop, val }) => prop
      )
    )
      // Only pick out props where the values are functions (hence handlers)
      .filter(
        ([prop, pairs]) =>
          pairs.length > 1 &&
          pairs.some(({ val }) => isFunction(val)) &&
          pairs.every(({ val }) => isNil(val) || isFunction(val))
      )
      .map(([prop, pairs]) =>
        // Convert the list of functions to a function that calls each in turn
        tuple(prop, (...args) =>
          pairs.forEach(({ val }) => val && val(...(args || [])))
        )
      )
  );
  return Object.assign({}, ...propss, mergedHandlers, {
    className: cx(withoutNils(propss.map((props) => props.className))),
    style: assignIn({}, ...propss.map((props) => props.style || {})),
  });
}

export function useReadablePromise<T, Err = Error>(
  rp: ReadablePromise<T, Err>
) {
  const [result, setResult] = useState(rp.result);
  spawn(rp.promise.then(() => setResult(rp.result)));
  return result;
}
