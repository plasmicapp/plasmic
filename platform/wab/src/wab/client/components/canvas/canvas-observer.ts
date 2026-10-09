import { useCanvasForceUpdate } from "@/wab/client/components/canvas/canvas-hooks";
import { SubDeps } from "@/wab/client/components/canvas/subdeps";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { Reaction } from "mobx";
import { computedFn } from "mobx-utils";
import type React from "react";

export const mkCanvasObserver = computedFn(
  (sub, vc) => (props: { children: () => React.ReactElement | null }) =>
    mkUseCanvasObserver(sub, vc)(props.children),
);

export const mkUseCanvasObserver = computedFn(
  (sub: SubDeps, vc: ViewCtx) =>
    /**
     * Observes mobx changes using sub.React for canvas elements.
     *
     * By default, after detecting a change, it calls `vc.addRerenderObserver`
     * with `forceUpdate` so the component will re-render in the next eval
     * phase, but it takes an optional param `onUpdateCallback` to allow
     * custom behaviors to run on each change (e.g., call `forceUpdate`
     * immediately).
     */
    function useObserver<T>(
      fn: () => T,
      baseComponentName: string = "observed",
      onUpdateCallback?: () => void,
    ): T {
      const forceUpdate = useCanvasForceUpdate(sub);

      const rerenderOnEval = sub.React.useCallback(
        () => vc.addRerenderObserver(forceUpdate),
        [forceUpdate],
      );
      const onUpdate = onUpdateCallback ?? rerenderOnEval;

      // StrictMode/ConcurrentMode/Suspense may mean that our component is
      // rendered and abandoned multiple times. The Reactions of abandoned
      // renders are disposed with the ViewCtx's canvasObservers.
      const reactionTrackingRef = sub.React.useRef<IReactionTracking | null>(
        null,
      );

      if (!reactionTrackingRef.current) {
        // First render for this component (or first time since a previous
        // reaction from an abandoned render was disposed).

        const newReaction = new Reaction(
          observerComponentNameFor(baseComponentName),
          () => {
            // Observable has changed, meaning we want to re-render
            // BUT if we're a component that hasn't yet got to the useEffect()
            // stage, we might be a component that _started_ to render, but
            // got dropped, and we don't want to make state changes then.
            // (It triggers warnings in StrictMode, for a start.)
            if (trackingData.mounted) {
              // We have reached useEffect(), so we're mounted, and can trigger an update
              onUpdate();
            } else {
              // We haven't yet reached useEffect(), so we'll need to trigger a re-render
              // when (and if) useEffect() arrives.
              trackingData.changedBeforeMount = true;
            }
          },
        );
        vc.canvasObservers.add(newReaction);

        const trackingData: IReactionTracking = {
          reaction: newReaction,
          mounted: false,
          changedBeforeMount: false,
        };
        reactionTrackingRef.current = trackingData;
      }

      const { reaction } = reactionTrackingRef.current!;

      sub.React.useEffect(() => {
        // Called on first mount only
        if (reactionTrackingRef.current) {
          // Great. We've already got our reaction from our render;
          // all we need to do is to record that it's now mounted,
          // to allow future observable changes to trigger re-renders
          reactionTrackingRef.current.mounted = true;
          // Got a change before first mount, force an update
          if (reactionTrackingRef.current.changedBeforeMount) {
            reactionTrackingRef.current.changedBeforeMount = false;
            onUpdate();
          }
        } else {
          // The reaction we set up in our render has been disposed, e.g.
          // StrictMode ran our effect cleanup before re-running the effect

          // Re-create the reaction
          reactionTrackingRef.current = {
            reaction: new Reaction(
              observerComponentNameFor(baseComponentName),
              () => {
                // We've definitely already been mounted at this point
                onUpdate();
              },
            ),
            mounted: true,
            changedBeforeMount: false,
          };
          vc.canvasObservers.add(reactionTrackingRef.current.reaction);

          forceUpdate();
        }

        return () => {
          vc.canvasObservers.delete(reactionTrackingRef.current!.reaction);
          if (!reactionTrackingRef.current!.reaction.isDisposed) {
            reactionTrackingRef.current!.reaction.dispose();
          }
          reactionTrackingRef.current = null;
        };
      }, [onUpdate]);

      if (vc.isDisposed) {
        return null as any;
      }

      let rendering!: T;
      let exception;
      reaction.track(() => {
        try {
          rendering = fn();
        } catch (e) {
          exception = e;
        }
      });

      if (exception) {
        throw exception; // re-throw any exceptions caught during rendering
      }

      return rendering;
    },
);

function observerComponentNameFor(baseComponentName: string) {
  return `observer${baseComponentName}`;
}

interface IReactionTracking {
  reaction: Reaction;
  mounted: boolean;
  changedBeforeMount: boolean;
}
