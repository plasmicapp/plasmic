import classNames from "classnames";
import { default as React, ReactNode, useEffect, useState } from "react";

export function ScreenDimmer({ children }: { children: ReactNode }) {
  const [fade, setFade] = useState(false);
  useEffect(() => {
    setTimeout(() => setFade(true), 0);
  });
  return (
    <div
      className={classNames({ ScreenDimmer: true, ScreenDimmer__Fade: fade })}
    >
      {children}
    </div>
  );
}
