import {
  isContextMenuOpen,
  maybeShowContextMenu,
} from "@/wab/client/components/ContextMenu";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import React from "react";

describe("maybeShowContextMenu", () => {
  it("can destroy an uncommitted menu without leaving a container or blocking later menus", () => {
    const originalChildren = Array.from(document.body.children);
    act(() => {
      const menu = maybeShowContextMenu(new MouseEvent("contextmenu"), <div />);
      expect(isContextMenuOpen()).toBe(true);
      menu?.destroy();
      expect(isContextMenuOpen()).toBe(false);
      const nextMenu = maybeShowContextMenu(
        new MouseEvent("contextmenu"),
        <div />,
      );
      expect(isContextMenuOpen()).toBe(true);
      // A stale destroy callback must not clear the new menu's open flag.
      menu?.destroy();
      expect(isContextMenuOpen()).toBe(true);
      nextMenu?.destroy();
    });
    expect(isContextMenuOpen()).toBe(false);
    expect(Array.from(document.body.children)).toEqual(originalChildren);
  });

  it("runs a mounted menu's action before dismissal and removes its portal", async () => {
    const originalChildren = Array.from(document.body.children);
    const action = vi.fn();
    act(() => {
      maybeShowContextMenu(
        new MouseEvent("contextmenu"),
        <button onClick={action}>Menu action</button>,
      );
    });
    fireEvent.click(screen.getByText("Menu action"));
    expect(action).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(isContextMenuOpen()).toBe(false));
    expect(screen.queryByText("Menu action")).toBeNull();
    expect(Array.from(document.body.children)).toEqual(originalChildren);
  });

  it("dismisses a mounted menu with Escape and permits another menu", () => {
    const originalChildren = Array.from(document.body.children);
    act(() => {
      maybeShowContextMenu(
        new MouseEvent("contextmenu"),
        <div>Escape menu</div>,
      );
    });
    expect(screen.getByText("Escape menu")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape", keyCode: 27 });
    expect(isContextMenuOpen()).toBe(false);
    expect(screen.queryByText("Escape menu")).toBeNull();
    act(() => {
      const nextMenu = maybeShowContextMenu(
        new MouseEvent("contextmenu"),
        <div />,
      );
      expect(isContextMenuOpen()).toBe(true);
      nextMenu?.destroy();
    });
    expect(Array.from(document.body.children)).toEqual(originalChildren);
  });
});
