import { PropValueEditor } from "@/wab/client/components/sidebar-tabs/PropValueEditor";
import { SidebarModalProvider } from "@/wab/client/components/sidebar/SidebarModal";
import { expect } from "@storybook/jest";
import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, waitFor, within } from "@storybook/testing-library";
import React from "react";

export default {
  component: PropValueEditor,
  args: {
    attr: "Attr",
    label: "Label",
    value: undefined,
  },
  argTypes: {
    onChange: { action: "changed" },
  },
  decorators: [
    (Story) => (
      <SidebarModalProvider>
        <Story />
      </SidebarModalProvider>
    ),
  ],
} as Meta<typeof PropValueEditor>;

export const boolean: StoryObj<typeof PropValueEditor> = {
  args: {
    propType: "boolean",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = canvas.getByRole("switch");
    await userEvent.click(editor);
    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith(true));
  },
};

export const number: StoryObj<typeof PropValueEditor> = {
  args: {
    propType: "number",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = canvas.getByRole("spinbutton");
    await userEvent.click(editor);
    await userEvent.type(editor, "2023");
    // doesn't work because of antd
    // https://github.com/ant-design/ant-design/issues/43251
    // await userEvent.keyboard("{Enter}");
    // instead, click outside
    await userEvent.click(canvasElement);
    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith(2023));
  },
};

export const href: StoryObj<typeof PropValueEditor> = {
  args: {
    propType: "href",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = canvas.getByRole("textbox");
    await userEvent.type(editor, "https://plasmic.app{Enter}");
    await waitFor(() =>
      expect(args.onChange).toHaveBeenCalledWith("https://plasmic.app")
    );
  },
};
