import { ModalScope } from "@/wab/client/components/widgets/ModalScope";
import { act, render, screen } from "@testing-library/react";
import React from "react";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("preserves outside focus when automatic focus is disabled, including remounts", async () => {
  const outside = document.createElement("input");
  document.body.appendChild(outside);
  outside.focus();
  try {
    const { rerender } = render(
      <ModalScope autoFocus={false} containFocus={false} key="first">
        <input aria-label="Browser search" />
      </ModalScope>,
    );
    await act(() => vi.advanceTimersByTime(100));
    expect(document.activeElement).toBe(outside);
    rerender(
      <ModalScope autoFocus={false} containFocus={false} key="second">
        <input aria-label="Browser search" />
      </ModalScope>,
    );
    await act(() => vi.advanceTimersByTime(100));
    expect(document.activeElement).toBe(outside);
  } finally {
    outside.remove();
  }
});

it("still automatically focuses an editor by default", async () => {
  render(
    <ModalScope>
      <input aria-label="Editor" />
    </ModalScope>,
  );
  await act(() => vi.advanceTimersByTime(100));
  expect(document.activeElement).toBe(
    screen.getByRole("textbox", { name: "Editor" }),
  );
});
