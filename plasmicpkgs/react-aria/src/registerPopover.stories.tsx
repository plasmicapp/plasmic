import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import React from "react";
import { BaseOverlayArrow } from "./registerOverlayArrow";
import { BasePopover } from "./registerPopover";

const meta: Meta<typeof BasePopover> = {
  title: "Components/BasePopover",
  component: BasePopover,
  args: {
    onOpenChange: fn(),
    children: (
      <div data-testid="popover-content">
        <h2>Standalone Popover</h2>
        <p>This popover is rendered without a trigger</p>
      </div>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof BasePopover>;

// Standalone popover should always remain open, because we assume that popover is always going to be controlled by a parent like Select, Combobox, DialogTrigger, etc, and its only really standalone in component view
export const Standalone: Story = {
  play: async ({ args }) => {
    const doc = within(document.body);

    // Verify popover is visible
    await waitFor(() => {
      expect(doc.getByTestId("popover-content")).toBeInTheDocument();
    });
    // Click outside should not dismiss popover
    await userEvent.click(document.body);
    expect(args.onOpenChange).not.toHaveBeenCalled();
  },
};

export const WithArrow: Story = {
  render: ({ children, ...args }) => (
    <BasePopover {...args}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
       .triangle-up {
          width: 1px;
          height: 1px;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-bottom: 10px solid black;
        }
     `,
        }}
      />
      <BaseOverlayArrow className={"triangle-up"} />
      {children}
    </BasePopover>
  ),
  play: async ({ args }) => {
    const doc = within(document.body);

    // Verify popover is visible
    await waitFor(() => {
      expect(doc.getByTestId("popover-content")).toBeInTheDocument();
      expect(document.querySelector(".triangle-up")).toBeInTheDocument();
    });
    // Click outside should not dismiss popover
    await userEvent.click(document.body);
    expect(args.onOpenChange).not.toHaveBeenCalled();
  },
};
