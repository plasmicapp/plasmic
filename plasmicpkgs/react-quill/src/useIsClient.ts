import React from "react";

export function useIsClient() {
    const [loaded, setLoaded] = React.useState(false);
    useIsomorphicLayoutEffect(() => {
        setLoaded(true);
    });
    return loaded;
}

const isBrowser = typeof window !== "undefined";
export const useIsomorphicLayoutEffect = isBrowser
    ? React.useLayoutEffect
    : React.useEffect;