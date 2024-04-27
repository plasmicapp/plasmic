import StyleCheckbox from "@/wab/client/components/style-controls/StyleCheckbox";
import { expect } from "@storybook/jest";
import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, waitFor, within } from "@storybook/testing-library";

export default {
  component: StyleCheckbox,
  argTypes: {
    onChange: { action: "changed" },
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
