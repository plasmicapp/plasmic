import { setElementStyles } from "@/wab/client/dom-utils";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { autorun } from "mobx";
import * as React from "react";
import { RefObject, useCallback, useMemo } from "react";

export function useZoomStyledRef<T extends HTMLElement>(
  fn: (zoom: number) => Partial<CSSStyleDeclaration>,
  ref?: RefObject<T>
) {
  const studioCtx = useStudioCtx();
  const id = useMemo(() => Math.random().toString(36).substr(2), []);
  const _ref = ref || React.useRef<T>(null);

  React.useEffect(() => {
    const dispose = autorun(
      () => {
        if (_ref.current) {
          setElementStyles(_ref.current, fn(studioCtx.zoom));
        }
      },
      {
        name: `zoomStyledRef_${id}`,
      }
    );
    return () => dispose();
  }, [fn, studioCtx, studioCtx.focusedViewCtx()?.arenaFrame()]);

  return _ref;
}

export function useScaledElementRef<T extends HTMLElement>({
  minZoom = 0,
  extraTransformation = "",
  disableScaling,
}: {
  extraTransformation?: string;
  minZoom?: number;
  disableScaling?: boolean;
} = {}) {
  const callback = useCallback(
    (zoom) =>
      disableScaling
        ? {}
        : {
            transform: `scale(${Math.min(
              1 / minZoom,
              1 / zoom
            )}) ${extraTransformation}`,
          },
    [minZoom, extraTransformation]
  );
  return useZoomStyledRef<T>(callback);
}
