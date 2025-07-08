import { useEffect, useState } from "react";

interface Selected<T extends HTMLElement | Element[]> {
  dom: T;
  selector: string;
}

/**
 * Runs document.querySelector inside an effect to return the first
 * element within document that matches the specified selector.
 *
 * @param selector String containing selector to match using
 * document.querySelector.
 */
export function useQuerySelector<T extends HTMLElement>(selector: string) {
  const [selected, setSelected] = useState<Selected<T> | null>(null);
  const isValid =
    !!selected && selected.dom.isConnected && selected.selector === selector;

  useEffect(() => {
    if (isValid) {
      // Cached element is still valid.
      return;
    }

    const element = document.querySelector(selector);
    if (element) {
      setSelected({ dom: element as T, selector });
    }
  }, [selector, isValid]);

  return selected?.dom;
}
