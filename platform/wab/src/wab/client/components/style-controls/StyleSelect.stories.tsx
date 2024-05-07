import StyleSelect from "@/wab/client/components/style-controls/StyleSelect";
import { expect } from "@storybook/jest";
import type { Meta, StoryObj } from "@storybook/react";
import { screen, userEvent, waitFor, within } from "@storybook/testing-library";
import React from "react";

export default {
  component: StyleSelect,
  argTypes: {
    onChange: { action: "changed" },
  },
} as Meta<typeof StyleSelect>;

export const OneOption: StoryObj<typeof StyleSelect> = {
  args: {
    placeholder: "Select something",
    children: <StyleSelect.Option value="first">First</StyleSelect.Option>,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("Select something"));
    // StyleSelect doesn't render the option in the storybook root,
    // so look for options in screen instead of canvas.
    await userEvent.click(screen.getByRole("option"));
    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith("first"));
  },
};

export const ThreeOptions: StoryObj<typeof StyleSelect> = {
  args: {
    placeholder: "Select something",
    children: (
      <>
        <StyleSelect.Option value="first">First</StyleSelect.Option>
        <StyleSelect.Option value="second">Second</StyleSelect.Option>
        <StyleSelect.Option value="third">Third</StyleSelect.Option>
      </>
    ),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button"));
    // StyleSelect doesn't render the option in the storybook root,
    // so look for options in screen instead of canvas.
    await userEvent.click(screen.getByText("First", { selector: "span" }));
    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith("first"));
    await userEvent.click(canvas.getByRole("button"));
    await userEvent.click(screen.getByText("Second", { selector: "span" }));
    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith("second"));
    await userEvent.click(canvas.getByRole("button"));
    await userEvent.click(screen.getByText("Third", { selector: "span" }));
    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith("third"));
  },
};
