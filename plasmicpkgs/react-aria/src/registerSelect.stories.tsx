import { PlasmicCanvasContext } from "@plasmicapp/host";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import React, { useEffect, useState } from "react";
import { BaseButton } from "./registerButton";
import { BaseListBox } from "./registerListBox";
import { BaseListBoxItem } from "./registerListBoxItem";
import { BasePopover } from "./registerPopover";
import { BaseSelect, BaseSelectValue } from "./registerSelect";

const meta: Meta<typeof BaseSelect> = {
  title: "Components/BaseSelect",
  component: BaseSelect,
  args: {
    onSelectionChange: fn(),
    onOpenChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof BaseSelect>;

// Helper function to create list items
const createListItems = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${i + 1}`,
    textValue: `Item ${i + 1}`,
    children: `Item ${i + 1}`,
  }));
};

const BoilerplateSelect = ({ children }: { children: React.ReactNode }) => (
  <>
    <BaseButton>
      <BaseSelectValue>Select an option ▼</BaseSelectValue>
    </BaseButton>
    <BasePopover>
      <BaseListBox>{children}</BaseListBox>
    </BasePopover>
  </>
);

export const Basic: Story = {
  args: {
    children: (
      <BoilerplateSelect>
        {createListItems(3).map((item) => (
          <BaseListBoxItem textValue={item.textValue} id={item.id}>
            {item.children}
          </BaseListBoxItem>
        ))}
      </BoilerplateSelect>
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // popovers are rendered outside canvas, so we need to use document.body
    const doc = within(document.body);

    // Get the button and input
    const button = canvas.getByRole("button");

    // Check that listbox is not in the document
    expect(doc.queryByRole("listbox")).not.toBeInTheDocument();
    expect(button).toHaveTextContent("Select an option ▼");

    // Open the select
    await userEvent.click(button);

    // Ensure that clicking the button shows all available options, regardless of the input value
    const options = await within(doc.getByRole("listbox")).findAllByRole(
      "option"
    );
    expect(options).toHaveLength(3);

    // Select an option
    await userEvent.click(options[1]);
    // Check that the input value is updated
    expect(button).toHaveTextContent("Item 2");

    // Check that listbox is not in the document
    expect(doc.queryByRole("listbox")).not.toBeInTheDocument();

    // Check that the onOpenChange and onSelectionChange are called as expected
    expect(args.onOpenChange).toHaveBeenCalledTimes(2);
    expect(args.onSelectionChange).toHaveBeenCalledOnce();
  },
};

// TODO: Currently, the BaseSelect does not pass defaultSelectedKey prop to <Select>, causing the below tests to fail.
// Uncomment the test below in the PR that fixes the issue
// export const WithDefaultSelection: Story = {
//   args: {
//     defaultSelectedKey: "3",
//     children: (
//       <BoilerplateSelect>
//         {createListItems(3).map((item) => (
//           <BaseListBoxItem textValue={item.textValue} id={item.id}>
//             {item.children}
//           </BaseListBoxItem>
//         ))}
//       </BoilerplateSelect>
//     ),
//   },
//   play: async ({ canvasElement }) => {
//     const canvas = within(canvasElement);
//     // popovers are rendered outside canvas, so we need to use document.body
//     const doc = within(document.body);

//     // Get the button and input
//     const button = canvas.getByRole("button");

//     // Check that listbox is not in the document
//     expect(doc.queryByRole("listbox")).not.toBeInTheDocument();

//     await waitFor(() => expect(button).toHaveTextContent("Item 3")); // via defaultSelectedKey

//     // Open the select
//     await userEvent.click(button);

//     const options = within(doc.getByRole("listbox")).getAllByRole("option");
//     await userEvent.click(options[1]);

//     expect(button).toHaveTextContent("Item 2");
//   },
// };

// export const Disabled: Story = {
//   args: {
//     defaultSelectedKey: "3",
//     isDisabled: true,
//     children: (
//       <BoilerplateSelect>
//         {createListItems(3).map((item) => (
//           <BaseListBoxItem textValue={item.textValue} id={item.id}>
//             {item.children}
//           </BaseListBoxItem>
//         ))}
//       </BoilerplateSelect>
//     ),
//   },
//   play: async ({ canvasElement, args }) => {
//     const canvas = within(canvasElement);
//     // popovers are rendered outside canvas, so we need to use document.body
//     const doc = within(document.body);

//     // Get the button and input
//     const button = canvas.getByRole("button");

//     // Verify disabled state
//     expect(button).toBeDisabled();

//     await userEvent.tab(); // NOTE: I'm not sure why, but without this, the test is very flaky at the next line.
//     await waitFor(() => expect(button).toHaveTextContent("Item 3")); // via defaultSelectedKey

//     // Open the select
//     await userEvent.click(button);

//     // Check that listbox is not in the document
//     expect(doc.queryByRole("listbox")).not.toBeInTheDocument();

//     expect(button).toHaveTextContent("Item 3"); // unchanged

//     expect(args.onOpenChange).not.toHaveBeenCalled();
//     expect(args.onSelectionChange).not.toHaveBeenCalled();
//   },
// };

export const WithDisabledOptions: Story = {
  args: {
    disabledKeys: ["1"],
    children: (
      <BoilerplateSelect>
        {createListItems(3).map((item) => (
          <BaseListBoxItem textValue={item.textValue} id={item.id}>
            {item.children}
          </BaseListBoxItem>
        ))}
      </BoilerplateSelect>
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // popovers are rendered outside canvas, so we need to use document.body
    const doc = within(document.body);

    // Get the button and input
    const button = canvas.getByRole("button");

    expect(doc.queryByRole("listbox")).not.toBeInTheDocument();
    expect(button).toHaveTextContent("Select an option ▼");

    // Open the select
    await userEvent.click(button);
    expect(args.onOpenChange).toHaveBeenCalledOnce();

    // Ensure that clicking the button shows all available options, regardless of the input value
    const listbox = await doc.findByRole("listbox");
    const options = await within(listbox).findAllByRole("option");
    expect(options).toHaveLength(3);

    // click the disabled option
    await userEvent.click(options[0]);
    expect(args.onOpenChange).toHaveBeenCalledOnce(); // the popover does not close when selecting a disabled option
    expect(args.onSelectionChange).not.toHaveBeenCalled(); // the select state does not change when selecting a disabled option
    expect(button).toHaveTextContent("Select an option ▼"); // unchanged

    await userEvent.click(options[1]); // Other items stay selectable
    expect(args.onOpenChange).toHaveBeenCalledTimes(2);
    expect(args.onSelectionChange).toHaveBeenCalledOnce();

    expect(button).toHaveTextContent("Item 2");
  },
};

export const SelectedInCanvas: Story = {
  args: {
    children: (
      <BoilerplateSelect>
        {createListItems(3).map((item) => (
          <BaseListBoxItem textValue={item.textValue} id={item.id}>
            {item.children}
          </BaseListBoxItem>
        ))}
      </BoilerplateSelect>
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
        <BaseSelect
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
