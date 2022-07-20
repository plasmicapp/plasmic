/** @format */

import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { AtomicContainer, DEFAULT_DATA } from "./Container";

export function CustomControl() {
  return (
    <DndProvider
      backend={HTML5Backend}
      options={{
        rootElement: window.parent,
      }}
    >
      <AtomicContainer defaultData={DEFAULT_DATA} />
    </DndProvider>
  );
}
