import { useEffect } from "react";

export function usePreventDefaultBrowserPinchToZoomBehavior() {
  useEffect(() => {
    const listener = (e: WheelEvent) => {
      // The `ctrlKey` check is used to detect if the mouse wheel event
      // is fired for the pinch-to-zoom gesture only.
      const { ctrlKey } = e;
      if (ctrlKey) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", listener, { passive: false });
    return () => window.removeEventListener("wheel", listener);
  }, []);
}
