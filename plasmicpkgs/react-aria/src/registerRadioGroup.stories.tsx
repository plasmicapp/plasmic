import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import React from "react";
import { BaseRadio } from "./registerRadio";
import { BaseRadioGroup } from "./registerRadioGroup";

const meta: Meta<typeof BaseRadioGroup> = {
  title: "Components/BaseRadioGroup",
  component: BaseRadioGroup,
  args: {
    onChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof BaseRadioGroup>;

// Helper function to create radio items
const createRadioItems = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    value: `radio${i + 1}`,
    label: `Radio ${i + 1}`,
  }));
};

// Basic RadioGroup with no initial selection
export const Basic: Story = {
  args: {
    children: createRadioItems(3).map((item) => (
      <BaseRadio value={item.value}>{item.label}</BaseRadio>
    )),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const radios = await canvas.findAllByRole("radio");
    expect(radios).toHaveLength(3);

    // Verify initial state
    radios.forEach((radio) => {
      expect(radio).not.toBeChecked();
    });

    // Test selection
    await userEvent.click(radios[1]);
    expect(radios[1]).toBeChecked();
    expect(args.onChange).toHaveBeenCalledWith("radio2");
  },
};

// RadioGroup with pre-selected values
export const WithDefaultSelection: Story = {
  args: {
    defaultValue: "radio1",
    children: createRadioItems(3).map((item) => (
      <BaseRadio value={item.value}>{item.label}</BaseRadio>
    )),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const radios = await canvas.findAllByRole("radio");

    // Verify initial state
    expect(radios[0]).toBeChecked(); // via defaultSelected prop passed to the group
    expect(radios[1]).not.toBeChecked();
    expect(radios[2]).not.toBeChecked();

    // Test deselection
    await userEvent.click(radios[2]);
    expect(radios[0]).not.toBeChecked(); //changed
    expect(radios[1]).not.toBeChecked(); //changed
    expect(radios[2]).toBeChecked();
    expect(args.onChange).toHaveBeenCalledWith("radio3");
  },
};

// Disabled RadioGroup
export const Disabled: Story = {
  args: {
    isDisabled: true,
    defaultValue: "radio1",
    children: createRadioItems(3).map((item) => (
      <BaseRadio key={item.value} value={item.value}>
        {item.label}
      </BaseRadio>
    )),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const radios = await canvas.findAllByRole("radio");

    // Verify disabled state
    radios.forEach((radio) => {
      expect(radio).toBeDisabled();
    });

    // Verify clicks don't trigger changes
    await userEvent.click(radios[1]);
    expect(args.onChange).not.toHaveBeenCalled();
    expect(radios[1]).not.toBeChecked();
  },
};

// ReadOnly RadioGroup
export const ReadOnly: Story = {
  args: {
    isReadOnly: true,
    defaultValue: "radio1",
    children: createRadioItems(3).map((item) => (
      <BaseRadio key={item.value} value={item.value}>
        {item.label}
      </BaseRadio>
    )),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const radios = await canvas.findAllByRole("radio");

    // Verify that the items are not disabled (but readonly)
    radios.forEach((radio) => {
      expect(radio).not.toBeDisabled();
    });

    // Verify clicks don't trigger changes
    await userEvent.click(radios[2]);
    expect(args.onChange).not.toHaveBeenCalled();
    expect(radios[2]).not.toBeChecked();
  },
};
