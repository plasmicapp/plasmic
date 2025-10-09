import type { Meta, StoryObj } from "@storybook/react";
import {
  Mock,
  expect,
  fn,
  spyOn,
  userEvent,
  waitFor,
  within,
} from "@storybook/test";
import React, { useEffect, useState } from "react";
import { ListBoxItem } from "react-aria-components";
import { BaseListBox } from "./registerListBox";
import { BaseListBoxItem } from "./registerListBoxItem";
import { BaseSection } from "./registerSection";

const meta: Meta<typeof BaseListBox> = {
  title: "Components/BaseListBox",
  component: BaseListBox,
  args: {
    onSelectionChange: fn(),
    "aria-label": "List Box",
  },
  argTypes: {
    selectionMode: {
      control: "radio",
      options: ["none", "single"],
      description: "The selection mode of the listbox",
    },
    selectedKeys: {
      control: "text",
      description: "Currently selected key(s)",
    },
    defaultSelectedKeys: {
      control: "text",
      description: "Default selected key(s)",
    },
  },
};

export default meta;
type Story = StoryObj<typeof BaseListBox>;

// Helper function to create list items
const createListItems = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${i + 1}`,
    textValue: `Item ${i + 1}`,
    children: `Item ${i + 1} - Description`,
  }));
};

// Basic ListBox with no selection
export const NoSelection: Story = {
  args: {
    selectionMode: "none",
    children: createListItems(3).map((item) => (
      <BaseListBoxItem key={item.id} id={item.id} textValue={item.textValue}>
        {item.children}
      </BaseListBoxItem>
    )),
  },
  render: (args) => {
    // This state is to simulate the plasmicUpdateVariant prop behaviour (which, when called, triggers a state update in PlasmicComponent.tsx files)
    const [_variant, setVariant] = useState("");
    const [showListBox, setShowListBox] = useState(false);

    useEffect(() => {
      // We delay the rendering of the ListBox to wait for the spies to be set up
      setTimeout(() => {
        setShowListBox(true);
      }, 10);
    }, []);

    if (!showListBox) {
      return <></>;
    }

    return (
      <>
        <BaseListBox
          {...args}
          plasmicUpdateVariant={() => {
            setVariant("new value");
          }}
        />
      </>
    );
  },
  play: async ({ canvasElement, args }) => {
    const consoleWarnSpy = spyOn(console, "warn");
    const consoleErrorSpy = spyOn(console, "error");

    const canvas = within(canvasElement);
    const options = await waitFor(
      () => within(canvas.getByRole("listbox")).findAllByRole("option"),
      { timeout: 100 }
    );
    expect(options).toHaveLength(3);
    await userEvent.click(options[1]);

    expect(args.onSelectionChange).not.toHaveBeenCalled();

    // Verify no selection occurred by checking aria-selected attribute
    expect(options[0]).not.toHaveAttribute("aria-selected");

    // Additional verification that none of the options are selected
    options.forEach((option) => {
      expect(option).not.toHaveAttribute("aria-selected");
    });

    // this is to ensure that no warnings or errors are logged during component interaction
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  },
};

// ListBox with single selection
export const SingleSelection: Story = {
  args: {
    selectionMode: "single",
    defaultSelectedKeys: "1",
    children: createListItems(3).map((item) => (
      <BaseListBoxItem key={item.id} id={item.id}>
        {item.children}
      </BaseListBoxItem>
    )),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const options = await within(canvas.getByRole("listbox")).findAllByRole(
      "option"
    );
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[1]).toHaveAttribute("aria-selected", "false");
    expect(options[2]).toHaveAttribute("aria-selected", "false");

    await userEvent.click(options[1]);
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(options[2]).toHaveAttribute("aria-selected", "false");
  },
};

// ListBox with sections
export const WithSections: Story = {
  args: {
    selectionMode: "single",
    children: [
      <BaseSection
        key="section1"
        header="Section 1"
        items={createListItems(2).map((item) => (
          <ListBoxItem key={item.id} id={item.id}>
            {item.children}
          </ListBoxItem>
        ))}
      />,
      <BaseSection
        key="section2"
        header="Section 2"
        items={createListItems(2).map((item) => (
          <ListBoxItem key={`s2-${item.id}`} id={`s2-${item.id}`}>
            {item.children}
          </ListBoxItem>
        ))}
      />,
    ],
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const options = await within(canvas.getByRole("listbox")).findAllByRole(
      "option"
    );
    let lastCallArg;

    options.forEach((option) => {
      expect(option).toHaveAttribute("aria-selected", "false");
    });

    // Test selection in first section
    await userEvent.click(options[0]);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    [options[1], options[2], options[3]].forEach((option) => {
      expect(option).toHaveAttribute("aria-selected", "false");
    });

    lastCallArg = (args.onSelectionChange as Mock).mock.calls[0][0];
    expect(lastCallArg.has("1")).toBe(true);

    // Test selection in second section
    await userEvent.click(options[2]); // First item in second section
    expect(options[2]).toHaveAttribute("aria-selected", "true");
    [options[0], options[1], options[3]].forEach((option) => {
      expect(option).toHaveAttribute("aria-selected", "false");
    });

    expect(args.onSelectionChange).toHaveBeenCalledTimes(2);

    lastCallArg = (args.onSelectionChange as Mock).mock.calls[1][0];
    expect(lastCallArg.has("s2-1")).toBe(true);
  },
};
// ListBox containing items with duplicate ids
export const WithDuplicateIds: Story = {
  args: {
    selectionMode: "single",
    defaultSelectedKeys: "1",
    children: (
      <>
        {createListItems(2).map((item) => (
          <BaseListBoxItem key={item.id} id={item.id}>
            {item.children}
          </BaseListBoxItem>
        ))}
        {createListItems(3).map((item) => (
          <BaseListBoxItem key={item.id} id={item.id}>
            {item.children}
          </BaseListBoxItem>
        ))}
        {createListItems(1).map((item) => (
          <BaseListBoxItem key={item.id} id={item.id}>
            {item.children}
          </BaseListBoxItem>
        ))}
      </>
    ),
  },
  play: async ({ canvasElement, args }) => {
    let lastCallArg;
    const canvas = within(canvasElement);
    const options = await within(canvas.getByRole("listbox")).findAllByRole(
      "option"
    );
    expect(options).toHaveLength(6);

    expect(options[0]).toHaveAttribute("aria-selected", "true");
    [1, 2, 3, 4, 5].forEach((index) => {
      expect(options[index]).toHaveAttribute("aria-selected", "false");
    });

    await userEvent.click(options[2]);

    lastCallArg = (args.onSelectionChange as Mock).mock.calls[0][0];
    expect(lastCallArg.has("1 duplicate(1)")).toBe(true);
    expect(options[2]).toHaveAttribute("aria-selected", "true");
    [0, 1, 3, 4, 5].forEach((index) => {
      expect(options[index]).toHaveAttribute("aria-selected", "false");
    });

    await userEvent.click(options[3]);
    lastCallArg = (args.onSelectionChange as Mock).mock.calls[1][0];
    expect(lastCallArg.has("2 duplicate(1)")).toBe(true);
    [0, 1, 2, 4, 5].forEach((index) => {
      expect(options[index]).toHaveAttribute("aria-selected", "false");
    });

    await userEvent.click(options[5]);
    lastCallArg = (args.onSelectionChange as Mock).mock.calls[2][0];
    expect(lastCallArg.has("1 duplicate(2)")).toBe(true);
    [0, 1, 2, 3, 4].forEach((index) => {
      expect(options[index]).toHaveAttribute("aria-selected", "false");
    });
  },
};

// ListBox containing items with duplicate ids
export const WithMissingIds: Story = {
  args: {
    selectionMode: "single",
    defaultSelectedKeys: "1",
    children: (
      <>
        {createListItems(2).map((item) => (
          <BaseListBoxItem key={item.id} id={item.id}>
            {item.children}
          </BaseListBoxItem>
        ))}
        <BaseListBoxItem>Item with missing id</BaseListBoxItem>
      </>
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const options = await within(canvas.getByRole("listbox")).findAllByRole(
      "option"
    );
    expect(options).toHaveLength(3);

    expect(options[0]).toHaveAttribute("aria-selected", "true");
    [1, 2].forEach((index) => {
      expect(options[index]).toHaveAttribute("aria-selected", "false");
    });

    await userEvent.click(options[2]);

    const lastCallArg = (args.onSelectionChange as Mock).mock.calls[0][0];
    expect(lastCallArg.has("missing(1)")).toBe(true);
    expect(options[2]).toHaveAttribute("aria-selected", "true");
    [0, 1].forEach((index) => {
      expect(options[index]).toHaveAttribute("aria-selected", "false");
    });
  },
};
