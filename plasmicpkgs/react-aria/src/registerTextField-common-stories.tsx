import type { StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import React, { useState } from "react";
import { BaseLabel } from "./registerLabel";
import { BaseTextField } from "./registerTextField";

export type Story = StoryObj<typeof BaseTextField>;

export const Basic: Story = {
  args: {
    onFocus: fn(),
    onBlur: fn(),
    onFocusChange: fn(),
    onKeyDown: fn(),
    onKeyUp: fn(),
    onBeforeInput: fn(),
    onInput: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const textbox = await canvas.findByRole("textbox");
    const label = await canvas.findByText("Label");

    // Verify initial state
    expect(textbox).not.toHaveFocus();

    // Test interaction
    await userEvent.click(label);
    await waitFor(() => {
      expect(textbox).toHaveFocus();
      expect(args.onFocus).toHaveBeenCalledOnce();
    });

    await userEvent.type(textbox, "testuser");
    expect(textbox).toHaveValue("testuser");
    await waitFor(() => {
      expect(args.onChange).toHaveBeenCalledTimes(8);
      expect(args.onInput).toHaveBeenCalledTimes(8);
      // onBeforeInput isn't fired by userEvent.type because of an issue in @testing-library/user-event or React: https://github.com/testing-library/user-event/issues/858#issuecomment-1124820366
      // On actual key presses, it is fired.
      // expect(args.onBeforeInput).toHaveBeenCalledTimes(8);
      expect(args.onKeyDown).toHaveBeenCalledTimes(8);
      expect(args.onKeyUp).toHaveBeenCalledTimes(8);
    });

    await userEvent.tab();
    await waitFor(() => {
      expect(textbox).not.toHaveFocus();
      expect(args.onBlur).toHaveBeenCalledOnce();
      expect(args.onFocusChange).toHaveBeenCalledTimes(2);
    });
  },
};

// TextField with initial value
export const WithInitialValue: Story = {
  args: {
    defaultValue: "initial value",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textbox = await canvas.findByRole("textbox");

    // Verify initial value
    expect(textbox).toHaveValue("initial value");
    await userEvent.type(textbox, "++");
    expect(textbox).toHaveValue("initial value++");
  },
};

// Disabled TextField
export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const textbox = await canvas.findByRole("textbox");

    // Verify disabled state
    expect(textbox).toBeDisabled();

    // Try to interact and verify nothing happens
    await userEvent.click(textbox);
    expect(textbox).not.toHaveFocus(); // not changed

    await userEvent.type(textbox, "++");
    expect(textbox).toHaveValue(""); // not changed
    expect(args.onChange).not.toHaveBeenCalled();
  },
};

// Read-only TextField
export const ReadOnly: Story = {
  args: {
    isReadOnly: true,
    defaultValue: "Read-only content",
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const textbox = await canvas.findByRole("textbox");

    // Verify read-only state
    expect(textbox).not.toBeDisabled();
    expect(textbox).toHaveValue("Read-only content");

    // Verify user can't type in the field
    await userEvent.type(textbox, "attempted edit");
    expect(textbox).toHaveValue("Read-only content"); // not changed
    expect(args.onChange).not.toHaveBeenCalled();
  },
};

export const AutoFocused: Story = {
  args: {
    autoFocus: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textbox = await canvas.findByRole("textbox");

    expect(textbox).toHaveFocus();
  },
};

// TextField with custom auto-complete
export const WithAutoComplete: Story = {
  args: {
    autoComplete: ["shipping", "street-address"],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textbox = await canvas.findByRole("textbox");

    // Verify autocomplete attribute
    expect(textbox).toHaveAttribute("autocomplete", "shipping street-address");
  },
};

// TextField with max length
export const WithMaxLength: Story = {
  args: {
    maxLength: 10,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textbox = await canvas.findByRole("textbox");

    // Verify maxlength attribute
    expect(textbox).toHaveAttribute("maxlength", "10");

    // Type more than max length and verify truncation
    await userEvent.type(textbox, "abcdefghijklmnopqrstuvwxyz");
    expect(textbox).toHaveValue("abcdefghij"); // uses the first 10 characters only
  },
};

// TextField with invalid state
export const Invalid: Story = {
  args: {
    isInvalid: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textbox = await canvas.findByRole("textbox");

    // Verify aria-invalid attribute
    expect(textbox).toHaveAttribute("aria-invalid", "true");
  },
};

export const createControlledTextFieldStory = (
  inputComponent: React.ReactElement
) =>
  ({
    render: (args) => {
      const [value, setValue] = useState(args.defaultValue ?? "");
      return (
        <BaseTextField
          {...args}
          value={value}
          onChange={(e) => {
            setValue(e);
            args.onChange?.(e);
          }}
        >
          <BaseLabel>Label</BaseLabel>
          {inputComponent}
        </BaseTextField>
      );
    },
    play: async ({ canvasElement, args }) => {
      const canvas = within(canvasElement);
      const textbox = await canvas.findByRole("textbox");
      expect(textbox).toHaveValue("");

      await userEvent.type(textbox, "testuser");
      expect(textbox).toHaveValue("testuser");
      expect(args.onChange).toHaveBeenCalledWith("testuser");
    },
  } as Story);
