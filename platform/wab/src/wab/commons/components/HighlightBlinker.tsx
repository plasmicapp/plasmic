import cn from "classnames";
import * as React from "react";
import { useTimeout } from "react-use";
import S from "./HighlightBlinker.module.scss";

export function HighlightBlinker({
  doScroll,
  onFinish,
}: {
  doScroll?: boolean;
  onFinish?: () => void;
}) {
  const [doUnmount] = useTimeout(1000);
  const isFinished = doUnmount();
  React.useEffect(() => {
    if (isFinished) {
      onFinish?.();
    }
  }, [doUnmount, isFinished]);
  return isFinished ? null : (
    <div
      className={cn({
        [S.HighlightBlinker]: true,
        [S.HighlightBlinker_Blink]: !doScroll,
        [S.HighlightBlinker_DelayedBlink]: doScroll,
      })}
      ref={(elt) => {
        if (elt && doScroll) {
          setTimeout(() => {
            elt.scrollIntoView({
              block: "center",
              inline: "center",
              behavior: "smooth",
            });
          }, 100);
        }
      }}
    />
  );
}
