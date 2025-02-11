import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import React from "react";
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
