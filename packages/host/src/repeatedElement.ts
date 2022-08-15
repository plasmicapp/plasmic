import { cloneElement, isValidElement } from "react";

/**
 * Allows elements to be repeated in Plasmic Studio.
 * @param index The index of the copy (starting at 0).
 * @param elt the React element to be repeated (or an array of such).
 */
export default function repeatedElement<T>(index: number, elt: T): T;
/**
 * Allows elements to be repeated in Plasmic Studio.
 * @param isPrimary should be true for at most one instance of the element, and
 * indicates which copy of the element will be highlighted when the element is
 * selected in Studio.
 * @param elt the React element to be repeated (or an array of such).
 */
export default function repeatedElement<T>(isPrimary: boolean, elt: T): T;
export default function repeatedElement<T>(index: boolean | number, elt: T): T {
  return repeatedElementFn(index as any, elt);
}

let repeatedElementFn: typeof repeatedElement = (
  index: boolean | number,
  elt: any
) => {
  if (Array.isArray(elt)) {
    return elt.map((v) => repeatedElementFn(index as any, v)) as any;
  }
  if (elt && isValidElement(elt) && typeof elt !== "string") {
    return cloneElement(elt) as any;
  }
  return elt;
};

const root = globalThis as any;
export const setRepeatedElementFn: (fn: typeof repeatedElement) => void =
  root?.__Sub?.setRepeatedElementFn ??
  function (fn: typeof repeatedElement) {
    repeatedElementFn = fn;
  };
