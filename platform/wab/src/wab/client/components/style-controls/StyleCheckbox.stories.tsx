import StyleCheckbox from "@/wab/client/components/style-controls/StyleCheckbox";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

export default {
  component: StyleCheckbox,
  args: {
    onChange: fn(),
  },
} as Meta<typeof StyleCheckbox>;

export const Default: StoryObj<typeof StyleCheckbox> = {
  args: {
    children: "Stylish checkbox",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = canvas.getByLabelText("Stylish checkbox");
    await userEvent.click(editor);
    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith(true));
  },
};
