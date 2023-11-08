import * as React from "react";

/** Returns an element matching the query selector in the root element. */
export function useQuerySelector(
  rootElOrSelector: Element | string,
  selector: string
): Element | null {
  return useQuerySelectorAll(rootElOrSelector, selector)[0] || null;
}

/** Returns the set of elements matching the query selector in the root element (order undefined). */
export function useQuerySelectorAll(
  rootElOrSelector: Element | string,
  selector: string
): Element[] {
  const [elements, setElements] = React.useState<Element[]>([]);

  React.useEffect(() => {
    const rootEl =
      rootElOrSelector instanceof Element
        ? rootElOrSelector
        : document.querySelector(rootElOrSelector);
    if (!rootEl) {
      throw new Error(
        `useQuerySelectorAll root element with selector '${rootElOrSelector}' not found`
      );
    }

    // Initial query
    setElements([...rootEl.querySelectorAll<Element>(selector).values()]);

    // Use mutation observer to track element additions and removals
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === "childList") {
          const removedElements = nodeListQuerySelector(
            record.removedNodes,
            selector
          );
          const addedElements = nodeListQuerySelector(
            record.addedNodes,
            selector
          );
          setElements((oldElements) => {
            const newElements = oldElements.filter(
              (element) => !removedElements.includes(element)
            );
            newElements.push(...addedElements);
            return newElements;
          });
        } else if (record.type === "attributes") {
          if (record.target instanceof Element) {
            const changedElement = record.target;
            setElements((oldElements) => {
              const oldMatches = oldElements.includes(changedElement);
              const newMatches = changedElement.matches(selector);
              if (!oldMatches && newMatches) {
                return [...oldElements, changedElement];
              } else if (oldMatches && !newMatches) {
                return oldElements.filter(
                  (element) => element !== changedElement
                );
              } else {
                return oldElements;
              }
            });
          }
        }
      });
    });
    observer.observe(rootEl, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [rootElOrSelector, selector]);

  return elements;
}

function nodeListQuerySelector(
  nodeList: NodeList,
  selector: string
): Element[] {
  const result: Element[] = [];
  nodeList.forEach((node) => {
    if (node instanceof Element) {
      node.querySelectorAll(selector).forEach((n) => result.push(n));
    }
  });
  return result;
}
