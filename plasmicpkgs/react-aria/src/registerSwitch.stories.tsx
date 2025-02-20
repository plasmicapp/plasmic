import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import React, { useState } from "react";
import { BaseSwitch } from "./registerSwitch";

const meta: Meta<typeof BaseSwitch> = {
  title: "Components/BaseSwitch",
  component: BaseSwitch,
  args: {
    onChange: fn(),
    children: (
      <>
        <div className="indicator" />
        Low power mode
      </>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof BaseSwitch>;

// Basic Switch with default state (unselected)
export const Basic: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const switchEl = await canvas.findByText("Low power mode");

    // Verify initial state
    expect(switchEl).not.toHaveAttribute("data-focused");
    expect(switchEl).not.toHaveAttribute("data-selected");

    // Toggle the switch on
    await userEvent.click(switchEl);
    expect(args.onChange).toHaveBeenCalledWith(true);
    expect(switchEl).toHaveAttribute("data-focused", "true");
    expect(switchEl).toHaveAttribute("data-selected", "true");

    await userEvent.keyboard("[Space]"); // simulate toggle on the focused switch
    expect(args.onChange).toHaveBeenCalledWith(false);
    expect(switchEl).not.toHaveAttribute("data-selected");
    expect(switchEl).toHaveAttribute("data-focused", "true");

    await userEvent.tab();
    expect(switchEl).not.toHaveAttribute("data-focused");

    expect(args.onChange).toHaveBeenCalledTimes(2);
  },
};

// Basic Switch with default state (selected)
export const WithInitialValue: Story = {
  args: {
    defaultSelected: true,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const switchEl = await canvas.findByText("Low power mode");

    expect(switchEl).not.toHaveAttribute("data-focused");
    expect(switchEl).toHaveAttribute("data-selected", "true");

    await userEvent.click(switchEl);
    expect(switchEl).not.toHaveAttribute("data-selected");
    expect(args.onChange).toHaveBeenCalledWith(false);
  },
};

export const AutoFocused: Story = {
  args: {
    autoFocus: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const switchEl = await canvas.findByText("Low power mode");

    waitFor(() => expect(switchEl).toHaveAttribute("data-focused", "true"));
  },
};

export const ReadOnly: Story = {
  args: {
    isReadOnly: true,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const switchEl = await canvas.findByText("Low power mode");

    expect(switchEl).not.toHaveAttribute("data-selected");
    expect(switchEl).not.toHaveAttribute("data-disabled");

    await userEvent.click(switchEl);
    expect(switchEl).not.toHaveAttribute("data-selected"); // unchanged
    expect(args.onChange).not.toHaveBeenCalled();
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const switchEl = await canvas.findByText("Low power mode");

    expect(switchEl).not.toHaveAttribute("data-selected");
    expect(switchEl).toHaveAttribute("data-disabled", "true");

    await userEvent.click(switchEl);
    expect(switchEl).not.toHaveAttribute("data-selected"); // unchanged
    expect(args.onChange).not.toHaveBeenCalled();
  },
};

export const Controlled: Story = {
  args: {
    defaultSelected: true,
  },
  render: (args) => {
    const [selected, setSelected] = useState(args.defaultSelected);
    return (
      <BaseSwitch
        {...args}
        isSelected={selected}
        onChange={(newVal) => {
          setSelected(newVal);
          args.onChange?.(newVal);
        }}
      >
        <div className="indicator" />
        Low power mode
      </BaseSwitch>
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const switchEl = await canvas.findByText("Low power mode");

    expect(switchEl).toHaveAttribute("data-selected", "true");
    await userEvent.click(switchEl);
    expect(switchEl).not.toHaveAttribute("data-selected");

    expect(args.onChange).toHaveBeenCalledWith(false);
    expect(args.onChange).toHaveBeenCalledOnce();

    await userEvent.click(switchEl);
    expect(switchEl).toHaveAttribute("data-selected", "true");

    expect(args.onChange).toHaveBeenCalledWith(true);
    expect(args.onChange).toHaveBeenCalledTimes(2);
  },
};
