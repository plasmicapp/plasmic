import type { Meta } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import React from "react";
import { BaseLabel } from "./registerLabel";
import { BaseTextArea } from "./registerTextArea";
import { BaseTextField } from "./registerTextField";
import {
  AutoFocused as AutoFocusedStory,
  Basic as BasicStory,
  Disabled as DisabledStory,
  Invalid as InvalidStory,
  ReadOnly as ReadOnlyStory,
  Story,
  WithInitialValue as WithInitialValueStory,
  WithMaxLength as WithMaxLengthStory,
  createControlledTextFieldStory,
} from "./registerTextField-common-stories";

const meta: Meta<typeof BaseTextField> = {
  title: "Components/BaseTextField (BaseTextArea)",
  component: BaseTextField,
  args: {
    children: (
      <>
        <BaseLabel>Label</BaseLabel>
        <BaseTextArea />
      </>
    ),
    onChange: fn(),
  },
};

export default meta;

export const Basic: Story = BasicStory;

// TextField with initial value
export const WithInitialValue: Story = WithInitialValueStory;

// Disabled TextField
export const Disabled: Story = DisabledStory;

// Read-only TextField
export const ReadOnly: Story = ReadOnlyStory;

export const AutoFocused: Story = AutoFocusedStory;

// TextField with max length
export const WithMaxLength: Story = WithMaxLengthStory;

// TextField with invalid state
export const Invalid: Story = InvalidStory;

export const Controlled: Story = createControlledTextFieldStory(
  <BaseTextArea />
);

export const AutoResize: Story = {
  args: {
    children: (
      <>
        <BaseLabel>Label</BaseLabel>
        <BaseTextArea autoResize />
      </>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textbox = await canvas.findByRole("textbox");

    const initialHeight = textbox.clientHeight;
    const resizeStyle = getComputedStyle(textbox).resize;
    expect(resizeStyle).toBe("none");
    await userEvent.type(
      textbox,
      "This is a long\ntext that\nshould expand\nthe textarea."
    );
    await waitFor(() => {
      expect(textbox.clientHeight).toBeGreaterThan(initialHeight);
    });
  },
};

export const Resizable: Story = {
  args: {
    children: (
      <>
        <BaseLabel>Label</BaseLabel>
        <BaseTextArea resize="horizontal" />
      </>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textbox = await canvas.findByRole("textbox");

    const resizeStyle = getComputedStyle(textbox).resize;
    expect(resizeStyle).toBe("horizontal");
  },
};
