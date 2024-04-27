import { SubDeps } from "@/wab/client/components/canvas/subdeps";
import defer = setTimeout;

// fork of isMounted using sub.React
export function useCanvasMountedState(sub: SubDeps): () => boolean {
  const mountedRef = sub.React.useRef<boolean>(false);
  const get = sub.React.useCallback(() => mountedRef.current, [sub]);

  sub.React.useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, [sub]);

  return get;
}

// Force update using sub.React
export function useCanvasForceUpdate(sub: SubDeps, sync = true) {
  const [, setState] = sub.React.useState<[]>();

  const isMounted = useCanvasMountedState(sub);

  const forceUpdate = sub.React.useCallback(
    () =>
      sync
        ? isMounted() && setState([])
        : defer(() => isMounted() && setState([])),
    [sub, sync]
  );

  return forceUpdate;
}
