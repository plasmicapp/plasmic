import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Popover, registerPopover } from "./popover";
import { Tooltip, registerTooltip } from "./tooltip";

vi.mock("@radix-ui/react-popover", () => mockPrimitives());
vi.mock("@radix-ui/react-tooltip", () => mockPrimitives());

describe.each([
  ["Popover", Popover, registerPopover, PopoverPrimitive.Content],
  ["Tooltip", Tooltip, registerTooltip, TooltipPrimitive.Content],
] as const)("%s collision padding", (_name, Component, register, Content) => {
  it("registers an optional advanced number in Studio", () => {
    const registerComponent = vi.fn();
    register({ registerComponent, registerGlobalContext: vi.fn() });
    const { collisionPadding } = registerComponent.mock.calls[0][1].props;
    expect(collisionPadding).toMatchObject({
      type: "number",
      defaultValueHint: 0,
      advanced: true,
    });
    expect(collisionPadding).not.toHaveProperty("defaultValue");
  });

  it("passes the configured padding to Radix content", () => {
    renderToStaticMarkup(<Component collisionPadding={8} />);
    expect(vi.mocked(Content).mock.lastCall?.[0].collisionPadding).toBe(8);
  });
});

function mockPrimitives() {
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    children;
  return {
    Root: passthrough,
    Provider: passthrough,
    Trigger: passthrough,
    Anchor: passthrough,
    Portal: passthrough,
    Content: vi.fn(() => null),
  };
}
