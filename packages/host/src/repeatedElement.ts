import { cloneElement, isValidElement } from "react";

/**
 * Allows a component from Plasmic Studio to be repeated.
 * `isPrimary` should be true for at most one instance of the component, and
 * indicates which copy of the element will be highlighted when the element is
 * selected in Studio.
 * If `isPrimary` is `false`, and `elt` is a React element (or an array of such),
 * it'll be cloned (using React.cloneElement) and ajusted if it's a component
 * from Plasmic Studio. Otherwise, if `elt` is not a React element, the original
 * value is returned.
 */
export default function repeatedElement<T,>(isPrimary: boolean, elt: T): T {
  return repeatedElementFn(isPrimary, elt);
}

let repeatedElementFn = <T,>(isPrimary: boolean, elt: T): T => {
  if (isPrimary) {
    return elt;
  }
  if (Array.isArray(elt)) {
    return elt.map((v) => repeatedElement(isPrimary, v)) as any as T;
  }
  if (elt && isValidElement(elt) && typeof elt !== "string") {
    return cloneElement(elt) as any as T;
  }
  return elt;
}

export function setRepeatedElementFn(fn: typeof repeatedElement) {
  repeatedElementFn = fn;
}


