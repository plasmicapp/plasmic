import registerComponent from "@plasmicapp/host/registerComponent";
import React, {
  ReactNode,
  RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

export default function useDirectionalIntersection({
  ref,
  scrollDownThreshold = 0.5,
  scrollUpThreshold = 0,
}: {
  ref: RefObject<HTMLElement>;
  scrollDownThreshold?: number;
  scrollUpThreshold?: number;
}) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (ref.current && typeof IntersectionObserver === "function") {
      const handler = (entries: IntersectionObserverEntry[]) => {
        if (entries[0].intersectionRatio >= scrollDownThreshold) {
          setRevealed(true);
        } else if (entries[0].intersectionRatio <= scrollUpThreshold) {
          setRevealed(false);
        }
      };

      const observer = new IntersectionObserver(handler, {
        root: null,
        rootMargin: "0%",
        threshold: [scrollUpThreshold, scrollDownThreshold],
      });
      observer.observe(ref.current);

      return () => {
        setRevealed(false);
        observer.disconnect();
      };
    }
    return () => {};
  }, [ref.current, scrollDownThreshold, scrollUpThreshold]);
  return revealed;
}

/**
 * Unlike react-awesome-reveal, ScrollRevealer:
 *
 * - has configurable thresholds
 * - triggers arbitrary render/unrender animations
 *
 * TODO: Merge this inta a general Reveal component, perhaps forking react-awesome-reveal, so that we don't have two different reveal components for users.
 */
export function ScrollRevealer({
  children,
  className,
  scrollDownThreshold = 0.5,
  scrollUpThreshold = 0,
}: {
  children?: ReactNode;
  className?: string;
  scrollUpThreshold?: number;
  scrollDownThreshold?: number;
}) {
  const intersectionRef = useRef<HTMLDivElement>(null);
  const revealed = useDirectionalIntersection({
    ref: intersectionRef,
    scrollUpThreshold,
    scrollDownThreshold,
  });
  return (
    <div className={className} ref={intersectionRef}>
      {revealed ? children : null}
    </div>
  );
}

registerComponent(ScrollRevealer, {
  name: "ScrollRevealer",
  displayName: "Scroll Revealer",
  importPath: "@plasmicpkgs/plasmic-basic-components/dist/ScrollRevealer",
  props: {
    children: "slot",
    scrollDownThreshold: {
      type: "number",
      displayName: "Scroll down threshold",
      // defaultValueHint: 0.5,
      description:
        "How much of the element (as a fraction) must you scroll into view for it to appear (defaults to 0.5)",
    },
    scrollUpThreshold: {
      type: "number",
      displayName: "Scroll up threshold",
      // defaultValueHint: 0,
      description:
        "While scrolling up, how much of the element (as a fraction) can still be scrolled in view before it disappears (defaults to 0, meaning you must scroll up until it's completely out of view)",
    },
  },
  isDefaultExport: true,
  defaultStyles: {
    width: "stretch",
    maxWidth: "100%",
  },
});
