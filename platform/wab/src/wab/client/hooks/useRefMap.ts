import React, { RefObject, useMemo } from "react";

/**
 * Creates a map of RefObject that can be used on dynamic lists
 * for which the ref of each element is needed
 */
export const useRefMap = <Key, RefType>() =>
  useMemo(() => {
    const refMap = new Map<Key, RefObject<RefType>>();

    return (key: Key) => {
      if (!refMap.has(key)) {
        refMap.set(key, React.createRef());
      }

      return refMap.get(key);
    };
  }, []);
