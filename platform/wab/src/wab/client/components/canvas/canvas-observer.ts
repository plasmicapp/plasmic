import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { Reaction } from "mobx";
import { computedFn } from "mobx-utils";
import type React from "react";
import { useCanvasForceUpdate } from "./canvas-hooks";
import { SubDeps } from "./subdeps";

/**
 * We use class to make it easier to detect in heap snapshots by name
 */
class ObjectToBeRetainedByReact {}

function objectToBeRetainedByReactFactory() {
  return new ObjectToBeRetainedByReact();
}

export const mkCanvasObserver = computedFn(
  (sub, vc) => (props: { children: () => React.ReactElement | null }) =>
    mkUseCanvasObserver(sub, vc)(props.children)
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
      onUpdateCallback?: () => void
    ): T {
      const [objectRetainedByReact] = sub.React.useState(
        objectToBeRetainedByReactFactory
      );

      const forceUpdate = useCanvasForceUpdate(sub);

      const rerenderOnEval = sub.React.useCallback(
        () => vc.addRerenderObserver(forceUpdate),
        [forceUpdate]
      );
      const onUpdate = onUpdateCallback ?? rerenderOnEval;

      // StrictMode/ConcurrentMode/Suspense may mean that our component is
      // rendered and abandoned multiple times, so we need to track leaked
      // Reactions.
      const reactionTrackingRef = sub.React.useRef<IReactionTracking | null>(
        null
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
          }
        );
        vc.canvasObservers.add(newReaction);

        const trackingData = addReactionToTrack(
          reactionTrackingRef,
          newReaction,
          objectRetainedByReact
        );
      }

      const { reaction } = reactionTrackingRef.current!;

      sub.React.useEffect(() => {
        // Called on first mount only
        recordReactionAsCommitted(reactionTrackingRef);

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
          // The reaction we set up in our render has been disposed.
          // This can be due to bad timings of renderings, e.g. our
          // component was paused for a _very_ long time, and our
          // reaction got cleaned up

          // Re-create the reaction
          reactionTrackingRef.current = {
            reaction: new Reaction(
              observerComponentNameFor(baseComponentName),
              () => {
                // We've definitely already been mounted at this point
                onUpdate();
              }
            ),
            mounted: true,
            changedBeforeMount: false,
            cleanAt: Infinity,
          };
          vc.canvasObservers.add(reactionTrackingRef.current.reaction);

          forceUpdate();
        }

        return () => {
          vc.canvasObservers.delete(reactionTrackingRef.current!.reaction);
          if (!reactionTrackingRef.current!.reaction.isDisposed_) {
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
    }
);

function observerComponentNameFor(baseComponentName: string) {
  return `observer${baseComponentName}`;
}

interface IReactionTracking {
  reaction: Reaction;
  mounted: boolean;
  changedBeforeMount: boolean;
  cleanAt: number;
  finalizationRegistryCleanupToken?: number;
}

const cleanupTokenToReactionTrackingMap = new Map<number, IReactionTracking>();

let globalCleanupTokensCounter = 1;

const registry = new FinalizationRegistry(function cleanupFunction(
  token: number
) {
  const trackedReaction = cleanupTokenToReactionTrackingMap.get(token);
  if (trackedReaction) {
    if (!trackedReaction.reaction.isDisposed_) {
      trackedReaction.reaction.dispose();
    }
    cleanupTokenToReactionTrackingMap.delete(token);
  }
});

function addReactionToTrack(
  reactionTrackingRef: React.MutableRefObject<IReactionTracking | null>,
  reaction: Reaction,
  objectRetainedByReact: object
) {
  const token = globalCleanupTokensCounter++;

  registry.register(objectRetainedByReact, token, reactionTrackingRef);
  reactionTrackingRef.current = createTrackingData(reaction);
  reactionTrackingRef.current.finalizationRegistryCleanupToken = token;
  cleanupTokenToReactionTrackingMap.set(token, reactionTrackingRef.current);

  return reactionTrackingRef.current;
}

function recordReactionAsCommitted(
  reactionRef: React.MutableRefObject<IReactionTracking | null>
) {
  registry.unregister(reactionRef);

  if (
    reactionRef.current &&
    reactionRef.current.finalizationRegistryCleanupToken
  ) {
    cleanupTokenToReactionTrackingMap.delete(
      reactionRef.current.finalizationRegistryCleanupToken
    );
  }
}

function createTrackingData(reaction: Reaction): IReactionTracking {
  return {
    reaction,
    mounted: false,
    changedBeforeMount: false,
    cleanAt: Date.now() + CLEANUP_LEAKED_REACTIONS_AFTER_MILLIS,
  };
}

/**
 * The minimum time before we'll clean up a Reaction created in a render
 * for a component that hasn't managed to run its effects. This needs to
 * be big enough to ensure that a component won't turn up and have its
 * effects run without being re-rendered.
 */
const CLEANUP_LEAKED_REACTIONS_AFTER_MILLIS = 10000;
