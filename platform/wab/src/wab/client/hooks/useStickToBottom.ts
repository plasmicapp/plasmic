import * as React from "react";

export interface StickToBottom {
  isStuck: boolean;
  stick: (shouldStick: boolean) => void;
}

export function useStickToBottom(
  scroller: HTMLElement | null,
  content: HTMLElement | null,
): StickToBottom {
  const [isStuck, _setIsStuck] = React.useState(true);
  const isStuckRef = React.useRef(true);
  const lastScrollTopRef = React.useRef(0);
  const setIsStuck = React.useCallback((stuck: boolean) => {
    isStuckRef.current = stuck;
    _setIsStuck(stuck);
  }, []);

  React.useEffect(() => {
    if (!scroller || !content) {
      return;
    }

    setIsStuck(true);
    lastScrollTopRef.current = scroller.scrollTop;

    const onScroll = () => {
      const movedUp = scroller.scrollTop < lastScrollTopRef.current;
      const movedDown = scroller.scrollTop > lastScrollTopRef.current;
      lastScrollTopRef.current = scroller.scrollTop;
      if (isAtBottom(scroller)) {
        if (movedDown) {
          setIsStuck(true);
        }
      } else if (movedUp) {
        setIsStuck(false);
      }
    };
    const observer = new ResizeObserver(() => {
      if (isAtBottom(scroller)) {
        setIsStuck(true);
      }
      if (isStuckRef.current) {
        scrollToBottom(scroller);
      }
      // Shrinking clamps the scroll position up; don't mistake that for the user.
      lastScrollTopRef.current = scroller.scrollTop;
    });

    scroller.addEventListener("scroll", onScroll);
    observer.observe(content);
    observer.observe(scroller);
    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", onScroll);
    };
  }, [scroller, content, setIsStuck]);

  const stick = React.useCallback(
    (shouldStick: boolean) => {
      setIsStuck(shouldStick);
      if (scroller) {
        // A queued scroll event must not undo an explicit stop at the bottom.
        lastScrollTopRef.current = scroller.scrollTop;
      }
      if (shouldStick && scroller) {
        scrollToBottom(scroller);
      }
    },
    [scroller, setIsStuck],
  );

  return { isStuck, stick };
}

function isAtBottom(el: HTMLElement) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= 2;
}

function scrollToBottom(el: HTMLElement) {
  el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
}
