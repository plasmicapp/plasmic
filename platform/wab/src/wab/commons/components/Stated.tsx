import { Observer } from "mobx-react";
import React, { ReactNode, useState } from "react";

export interface StatedProps<T> {
  defaultValue: T;
  children: (value: T, setValue: (x: T) => void) => ReactNode;
  observe?: boolean;
}

export function Stated<T>({ defaultValue, children, observe }: StatedProps<T>) {
  const [value, setValue] = useState(defaultValue);
  if (observe) {
    return <Observer>{() => <>{children(value, setValue)}</>}</Observer>;
  } else {
    return <>{children(value, setValue)}</>;
  }
}
