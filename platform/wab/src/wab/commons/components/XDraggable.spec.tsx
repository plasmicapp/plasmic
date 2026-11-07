import { XDraggable } from "@/wab/commons/components/XDraggable";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

vi.mock("@/wab/client/components/top-view", () => ({
  withAppContext: (Component: React.ComponentType<any>) => (props: any) => (
    <Component {...props} app={{ setIsDragging: vi.fn() }} />
  ),
}));

it("cancels a drag before the source's keyboard scope consumes Escape", () => {
  const onStop = vi.fn();
  const onEscapeInPicker = vi.fn();
  render(
    <div
      onKeyDownCapture={(e) => {
        if (e.key === "Escape") {
          onEscapeInPicker();
          e.stopPropagation();
        }
      }}
    >
      <input aria-label="Search" />
      <XDraggable onStop={onStop}>
        <button>Drag data</button>
      </XDraggable>
    </div>,
  );
  const input = screen.getByRole("textbox");
  input.focus();
  fireEvent.mouseDown(screen.getByRole("button"), {
    button: 0,
    clientX: 10,
    clientY: 10,
  });
  fireEvent.mouseMove(document, { clientX: 30, clientY: 30 });
  fireEvent.keyDown(input, { key: "Escape" });
  expect(onStop).toHaveBeenCalledOnce();
  expect(onStop.mock.calls[0][0].data.aborted).toBe(true);
  expect(onEscapeInPicker).not.toHaveBeenCalled();
  fireEvent.mouseUp(document);
  expect(onStop).toHaveBeenCalledOnce();
});
