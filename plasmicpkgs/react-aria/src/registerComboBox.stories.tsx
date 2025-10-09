import { PlasmicCanvasContext } from "@plasmicapp/host";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, spyOn, userEvent, waitFor, within } from "@storybook/test";
import React, { useEffect, useState } from "react";
import { BaseButton } from "./registerButton";
import { BaseComboBox } from "./registerComboBox";
import { BaseInput } from "./registerInput";
import { BaseLabel } from "./registerLabel";
import { BaseListBox } from "./registerListBox";
import { BaseListBoxItem } from "./registerListBoxItem";
import { BasePopover } from "./registerPopover";

const meta: Meta<typeof BaseComboBox> = {
  title: "Components/BaseComboBox",
  component: BaseComboBox,
  args: {
    onSelectionChange: fn(),
    onOpenChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof BaseComboBox>;

// Helper function to create list items
const createListItems = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${i + 1}`,
    textValue: `Item ${i + 1}`,
    children: `Item ${i + 1}`,
  }));
};

const BoilerplateCombobox = ({ children }: { children: React.ReactNode }) => (
  <>
    <BaseLabel>Choose an option</BaseLabel>
    <BaseInput />
    <BaseButton>▼</BaseButton>
    <BasePopover>
      <BaseListBox>{children}</BaseListBox>
    </BasePopover>
  </>
);

export const Basic: Story = {
  args: {
    children: (
      <BoilerplateCombobox>
        {createListItems(3).map((item) => (
          <BaseListBoxItem
            textValue={item.textValue}
            id={item.id}
            key={item.id}
          >
            {item.children}
          </BaseListBoxItem>
        ))}
      </BoilerplateCombobox>
    ),
  },
  render: (args) => {
    // This state is to simulate the plasmicUpdateVariant prop behaviour (which, when called, triggers a state update in PlasmicComponent.tsx files)
    const [_variant, setVariant] = useState("");
    const [showCombobox, setShowCombobox] = useState(false);

    useEffect(() => {
      // We delay the rendering of the Combobox to wait for the spies to be set up
      setTimeout(() => {
        setShowCombobox(true);
      }, 10);
    }, []);

    if (!showCombobox) {
      return <></>;
    }

    return (
      <>
        <BaseComboBox
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
    // popovers are rendered outside canvas, so we need to use document.body
    const doc = within(document.body);

    // Get the button and input
    const input = await waitFor(() => canvas.getByRole("combobox"), {
      timeout: 100,
    });
    const button = canvas.getByText("▼");

    // Check that listbox is not in the document
    expect(doc.queryByRole("listbox")).not.toBeInTheDocument();

    // Open the combobox
    await userEvent.click(button);

    // Ensure that clicking the button shows all available options, regardless of the input value
    const options = await within(doc.getByRole("listbox")).findAllByRole(
      "option"
    );
    expect(options).toHaveLength(3);

    // Select an option
    await userEvent.click(options[1]);
    // Check that the input value is updated
    expect(input).toHaveValue("Item 2");

    // Check that listbox is not in the document
    expect(doc.queryByRole("listbox")).not.toBeInTheDocument();

    // Check that the onOpenChange and onSelectionChange are called as expected
    expect(args.onOpenChange).toHaveBeenCalledTimes(2);
    expect(args.onSelectionChange).toHaveBeenCalledOnce();

    // this is to ensure that no warnings or errors are logged during component interaction
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  },
};

export const WithTyping: Story = {
  args: {
    children: (
      <BoilerplateCombobox>
        {createListItems(3).map((item) => (
          <BaseListBoxItem textValue={item.textValue} id={item.id}>
            {item.children}
          </BaseListBoxItem>
        ))}
        {createListItems(1).map((item) => (
          <BaseListBoxItem textValue={`${item.textValue} dup`} id={item.id}>
            {item.children} dup
          </BaseListBoxItem>
        ))}
      </BoilerplateCombobox>
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // popovers are rendered outside canvas, so we need to use document.body
    const doc = within(document.body);

    // Get the button and input
    const input = canvas.getByRole("combobox");

    // Check that listbox is not in the document
    expect(doc.queryByRole("listbox")).not.toBeInTheDocument();

    // Simulate keyboard interaction and select an option
    await userEvent.type(input, "Item 1{ArrowDown}{ArrowDown}{Enter}");
    expect(input).toHaveValue("Item 1 dup");

    // confirm that the input can't retain a value that is not selected from the listbox
    await userEvent.type(input, "{backspace}{backspace}{backspace}{backspace}");
    expect(input).toHaveValue("Item 1");
    expect(
      within(doc.getByRole("listbox")).getAllByRole("option")
    ).toHaveLength(2);

    await userEvent.tab(); // simulates input blur
    expect(input).toHaveValue("Item 1 dup");

    // Check that the onOpenChange and onSelectionChange are called as expected
    expect(args.onOpenChange).toHaveBeenCalledTimes(4);
    expect(args.onSelectionChange).toHaveBeenCalledTimes(1);
  },
};

export const WithDefaultSelection: Story = {
  args: {
    defaultSelectedKey: "3",
    children: (
      <BoilerplateCombobox>
        {createListItems(3).map((item) => (
          <BaseListBoxItem textValue={item.textValue} id={item.id}>
            {item.children}
          </BaseListBoxItem>
        ))}
      </BoilerplateCombobox>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // popovers are rendered outside canvas, so we need to use document.body
    const doc = within(document.body);

    // Get the button and input
    const input = canvas.getByRole("combobox");

    // Check that listbox is not in the document
    expect(doc.queryByRole("listbox")).not.toBeInTheDocument();

    await waitFor(() => expect(input).toHaveValue("Item 3")); // via defaultSelectedKey

    // Open the combobox
    await userEvent.click(canvas.getByText("▼"));

    const options = within(doc.getByRole("listbox")).getAllByRole("option");
    await userEvent.click(options[1]);

    expect(input).toHaveValue("Item 2");
  },
};

export const Disabled: Story = {
  args: {
    defaultSelectedKey: "3",
    isDisabled: true,
    children: (
      <BoilerplateCombobox>
        {createListItems(3).map((item) => (
          <BaseListBoxItem textValue={item.textValue} id={item.id}>
            {item.children}
          </BaseListBoxItem>
        ))}
      </BoilerplateCombobox>
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // popovers are rendered outside canvas, so we need to use document.body
    const doc = within(document.body);

    // Get the button and input
    const input = canvas.getByRole("combobox");
    const button = canvas.getByText("▼");

    // Verify disabled state
    expect(input).toBeDisabled();
    expect(button).toBeDisabled();

    await waitFor(() => expect(input).toHaveValue("Item 3")); // via defaultSelectedKey
    expect(input).toHaveValue("Item 3"); // via defaultSelectedKey

    // Open the combobox
    await userEvent.click(button);

    // Check that listbox is not in the document
    expect(doc.queryByRole("listbox")).not.toBeInTheDocument();

    await userEvent.type(input, "{Backspace}{ArrowDown}{Enter}");
    expect(input).toHaveValue("Item 3"); // unchanged

    // Check that listbox is not in the document
    expect(doc.queryByRole("listbox")).not.toBeInTheDocument();

    expect(args.onOpenChange).not.toHaveBeenCalled();
    expect(args.onSelectionChange).not.toHaveBeenCalled();
  },
};

export const WithDisabledOptions: Story = {
  args: {
    disabledKeys: ["1"],
    children: (
      <BoilerplateCombobox>
        {createListItems(3).map((item) => (
          <BaseListBoxItem textValue={item.textValue} id={item.id}>
            {item.children}
          </BaseListBoxItem>
        ))}
      </BoilerplateCombobox>
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // popovers are rendered outside canvas, so we need to use document.body
    const doc = within(document.body);

    // Get the button and input
    const input = canvas.getByRole("combobox");
    const button = canvas.getByText("▼");

    expect(doc.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveValue("");

    // Open the combobox
    await userEvent.click(button);
    expect(args.onOpenChange).toHaveBeenCalledOnce();

    // Ensure that clicking the button shows all available options, regardless of the input value
    const listbox = await doc.findByRole("listbox");
    const options = await within(listbox).findAllByRole("option");
    expect(options).toHaveLength(3);

    await userEvent.click(options[0]);
    expect(args.onOpenChange).toHaveBeenCalledOnce(); // the popover does not close when selecting a disabled option
    expect(args.onSelectionChange).not.toHaveBeenCalled(); // the combobox state does not change when selecting a disabled option
    expect(input).toHaveValue("");

    await userEvent.click(options[1]); // Other items stay selectable
    expect(args.onOpenChange).toHaveBeenCalledTimes(2);
    expect(args.onSelectionChange).toHaveBeenCalledOnce();

    expect(input).toHaveValue("Item 2");
  },
};

export const SelectedInCanvas: Story = {
  args: {
    children: (
      <BoilerplateCombobox>
        {createListItems(3).map((item) => (
          <BaseListBoxItem textValue={item.textValue} id={item.id}>
            {item.children}
          </BaseListBoxItem>
        ))}
      </BoilerplateCombobox>
    ),
  },
  render: ({ __plasmic_selection_prop__, ...args }) => {
    const [selected, setSelected] = useState(false);
    useEffect(() => {
      setTimeout(() => {
        setSelected(true);
      }, 1000);
    }, []);

    return (
      // Simulate Plasmic canvas envirnment
      <PlasmicCanvasContext.Provider
        value={{
          componentName: "test",
          globalVariants: {},
        }}
      >
        <BaseComboBox
          // Simulate node selection in Plasmic canvas
          __plasmic_selection_prop__={{
            isSelected: selected,
          }}
          {...args}
        />
      </PlasmicCanvasContext.Provider>
    );
  },
  play: async () => {
    // popovers are rendered outside canvas, so we need to use document.body
    const doc = within(document.body);

    await waitFor(
      () => {
        expect(doc.queryByRole("listbox")).not.toBeInTheDocument();
      },
      { timeout: 100 }
    );

    await waitFor(
      () => {
        expect(doc.queryByRole("listbox")).toBeInTheDocument();
      },
      { timeout: 1100 }
    );
  },
};
