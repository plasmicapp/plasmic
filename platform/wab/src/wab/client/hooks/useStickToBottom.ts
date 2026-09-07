import * as React from "react";

export interface StickToBottom {
  isStuck: boolean;
  stick: (shouldStick: boolean) => void;
}

export function useStickToBottom(
  scroller: HTMLElement | null,
  content: HTMLElement | null
): StickToBottom {
  const [isStuck, _setIsStuck] = React.useState(true);
  const isStuckRef = React.useRef(true);
  const setIsStuck = React.useCallback((stuck: boolean) => {
    isStuckRef.current = stuck;
    _setIsStuck(stuck);
  }, []);

  React.useEffect(() => {
    if (!scroller || !content) {
      return;
    }

    setIsStuck(true);
    let lastScrollTop = scroller.scrollTop;

    const onScroll = () => {
      const movedUp = scroller.scrollTop < lastScrollTop;
      lastScrollTop = scroller.scrollTop;
      if (isAtBottom(scroller)) {
        setIsStuck(true);
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
      lastScrollTop = scroller.scrollTop;
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
      if (shouldStick && scroller) {
        scrollToBottom(scroller);
      }
    },
    [scroller, setIsStuck]
  );

  return { isStuck, stick };
}

function isAtBottom(el: HTMLElement) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= 2;
}

function scrollToBottom(el: HTMLElement) {
  el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
}
