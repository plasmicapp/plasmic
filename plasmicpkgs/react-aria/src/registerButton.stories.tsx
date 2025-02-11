import { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import React from "react";
import { Form, Input } from "react-aria-components";
import { BaseButton } from "./registerButton";

export default {
  title: "Components/BaseButton",
  component: BaseButton,
  args: {
    children: "Click Me",
    onPress: fn(),
    onFocus: fn(),
  },
  parameters: {
    onSubmit: fn(),
    onReset: fn(),
  },
} satisfies Meta<typeof BaseButton>;

type Story = StoryObj<typeof BaseButton>;

// Reusable test form wrapper
const TestForm: React.FC<{
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  onReset?: (e: React.FormEvent) => void;
}> = ({ children, onSubmit, onReset }) => (
  <Form onSubmit={onSubmit} onReset={onReset}>
    <Input role="input" name="test-input" aria-label="Test input" />
    {children}
  </Form>
);

export const Basic: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByText("Click Me");

    await userEvent.click(button);

    expect(button).toHaveFocus();
    expect(args.onPress).toHaveBeenCalledOnce();
    expect(args.onFocus).toHaveBeenCalledOnce();
  },
};

export const AutoFocusedButton: Story = {
  args: {
    autoFocus: true,
  },
  render: (args) => (
    <TestForm>
      <BaseButton {...args} />
    </TestForm>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      expect(canvas.getByText("Click Me")).toHaveFocus();
    });
  },
};

export const DisabledButton: Story = {
  args: {
    isDisabled: true,
  },
  render: (args) => (
    <TestForm>
      <BaseButton {...args} />
    </TestForm>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByText("Click Me");

    await userEvent.click(button);
    expect(button).not.toHaveFocus();
    expect(button).toBeDisabled();
  },
};

export const SubmitButton: Story = {
  args: {
    children: "Submit",
    submitsForm: true,
  },
  render: (args, { parameters }) => {
    return (
      <TestForm
        onSubmit={(e) => {
          e.preventDefault();
          parameters.onSubmit(e);
        }}
      >
        <BaseButton {...args} />
      </TestForm>
    );
  },
  play: async ({ canvasElement, parameters }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByText("Submit");
    await userEvent.click(button);
    expect(parameters.onSubmit).toHaveBeenCalledOnce();
    expect(parameters.onReset).not.toHaveBeenCalled();
  },
};

export const ResetButton: Story = {
  args: {
    children: "Reset",
    resetsForm: true,
  },
  render: (args, { parameters }) => (
    <TestForm
      onSubmit={(e) => {
        e.preventDefault();
        parameters.onSubmit(e);
      }}
      onReset={parameters.onReset}
    >
      <BaseButton {...args} />
    </TestForm>
  ),
  play: async ({ canvasElement, parameters }) => {
    const canvas = within(canvasElement);
    const form = canvasElement.getElementsByTagName("form")[0];
    const input = canvasElement.getElementsByTagName("input")[0];
    await userEvent.type(input, "Hello World");
    expect(form).toHaveFormValues({ "test-input": "Hello World" });
    const button = canvas.getByText("Reset");
    expect(button).toHaveAttribute("type", "reset");
    await userEvent.click(button);
    expect(form).toHaveFormValues({});
    expect(parameters.onReset).toHaveBeenCalledOnce();
    expect(parameters.onSubmit).not.toHaveBeenCalled();
  },
};

export const LinkButton: Story = {
  args: {
    children: "Go to Google",
    href: "https://www.google.com",
    target: "_blank",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByText("Go to Google");

    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "https://www.google.com");
    expect(link).toHaveAttribute("target", "_blank");
    await userEvent.click(link);
  },
};
