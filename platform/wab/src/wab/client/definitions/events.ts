export const plasmicIFrameWheelEvent = "plasmicIFrameWheelEvent";
export const plasmicIFrameMouseDownEvent = "plasmicIFrameMouseDownEvent";
export const plasmicCanvasTransformEvent = "plasmicCanvasTransformEvent";

function createCustomEvent<T>(name: string) {
  return {
    dispatch(detail: T) {
      window.dispatchEvent(
        new CustomEvent<T>(name, {
          detail,
        })
      );
    },

    subscribe(listener: (detail: T) => void) {
      const _listener = (e: Event) => {
        const detail = (e as CustomEvent<T>).detail;
        listener(detail);
      };

      window.addEventListener(name, _listener);

      return () => {
        window.removeEventListener(name, _listener);
      };
    },
  };
}
