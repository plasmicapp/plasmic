import MenuButton from "@/wab/client/components/widgets/MenuButton";
import { fireEvent, render, screen } from "@testing-library/react";
import { Menu } from "antd";
import React from "react";

describe("MenuButton", () => {
  it("cancels the click, so an enclosing link does not navigate", async () => {
    render(
      <a href="/projects/foo">
        <MenuButton
          menu={<Menu items={[{ key: "configure", label: "Configure" }]} />}
        />
      </a>
    );
    // fireEvent returns false when the event was canceled; antd's click
    // trigger no longer calls preventDefault itself.
    expect(fireEvent.click(screen.getByRole("button"))).toBe(false);
    expect(await screen.findByText("Configure")).toBeTruthy();
  });
});
