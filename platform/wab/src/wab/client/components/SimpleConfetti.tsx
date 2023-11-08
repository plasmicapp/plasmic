import * as React from "react";
import ReactConfetti from "react-confetti";
import { useWindowSize } from "react-use";

export function SimpleConfetti() {
  const { width, height } = useWindowSize();
  return (
    <ReactConfetti
      width={width}
      height={height}
      numberOfPieces={32}
      recycle={false}
    />
  );
}
