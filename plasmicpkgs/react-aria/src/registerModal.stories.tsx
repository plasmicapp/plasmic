import { PlasmicCanvasContext } from "@plasmicapp/host";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import React, { useEffect, useState } from "react";
import { BaseModal } from "./registerModal";

const meta: Meta<typeof BaseModal> = {
  title: "Components/BaseModal",
  component: BaseModal,

  args: {
    onOpenChange: fn(),
    children: (
      <div data-testid="modal-content">
        <h2>Modal Title</h2>
        <p>Modal content goes here</p>
      </div>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof BaseModal>;

export const Basic: Story = {
  args: {
    isOpen: true,
    isDismissable: true,
  },
  play: async ({ args }) => {
    const doc = within(document.body);

    // Modal should be visible
    const modal = doc.getByTestId("modal-content");
    expect(modal).toBeInTheDocument();
    expect(modal).toBeVisible();

    // Click outside to dismiss
    await userEvent.click(document.body);
    expect(args.onOpenChange).toHaveBeenCalledWith(false);
  },
};

export const NonDismissable: Story = {
  args: {
    isOpen: true,
    isDismissable: false,
  },
  play: async ({ args }) => {
    const doc = within(document.body);

    // Modal should be visible
    const modal = doc.getByTestId("modal-content");
    expect(modal).toBeInTheDocument();
    expect(modal).toBeVisible();

    // Click outside should not dismiss
    await userEvent.click(document.body);
    expect(args.onOpenChange).not.toHaveBeenCalled();
    expect(modal).toBeInTheDocument();
  },
};

export const KeyboardDismissDisabled: Story = {
  args: {
    isOpen: true,
    isDismissable: true,
    isKeyboardDismissDisabled: true,
  },
  play: async ({ args }) => {
    const doc = within(document.body);

    // Modal should be visible
    const modal = doc.getByTestId("modal-content");
    expect(modal).toBeInTheDocument();

    // Press Escape should not dismiss
    await userEvent.keyboard("{Escape}");
    expect(args.onOpenChange).not.toHaveBeenCalled();
    expect(modal).toBeInTheDocument();
  },
};

export const ImperativeControl: Story = {
  render: ({ onOpenChange, ...args }) => {
    const modalRef = React.useRef<{ close: () => void; open: () => void }>(
      null
    );
    const [open, setOpen] = useState(true);

    return (
      <div>
        <button onClick={() => modalRef.current?.open()}>Open Modal</button>

        <BaseModal
          isOpen={open}
          onOpenChange={(newValue) => {
            onOpenChange?.(newValue);
            setOpen(newValue);
          }}
          ref={modalRef}
          {...args}
        >
          <div data-testid="modal-content">
            <h2>Test Modal</h2>

            <button onClick={() => modalRef.current?.close()}>
              Close Modal
            </button>
          </div>
        </BaseModal>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const doc = within(document.body);
    const canvas = within(canvasElement);

    await waitFor(() => {
      expect(doc.getByTestId("modal-content")).toBeInTheDocument();
    });

    // Find and click the close button
    const closeButton = doc.getByText("Close Modal");
    await userEvent.click(closeButton);

    // Modal should be closed
    await waitFor(() => {
      expect(doc.queryByTestId("modal-content")).not.toBeInTheDocument();
    });

    // Find and click the open button
    const openButton = canvas.getByText("Open Modal");
    await userEvent.click(openButton);

    // Modal should be open again
    await waitFor(() => {
      expect(doc.getByTestId("modal-content")).toBeInTheDocument();
    });
  },
};

export const SelectedInCanvas: Story = {
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
        <BaseModal
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

    await waitFor(() => {
      expect(doc.queryByTestId("modal-content")).not.toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(doc.queryByTestId("modal-content")).toBeInTheDocument();
      },
      { timeout: 1100 }
    );
  },
};

// Verifies that `id` is applied to the <Modal> element (not the overlay)
export const IdOnModal: Story = {
  args: {
    isOpen: true,
    isDismissable: false,
    id: "modal-root",
  },
  play: async () => {
    const doc = within(document.body);
    // Anchor inside the rendered Modal content
    const modalContent = await doc.findByTestId("modal-content");
    // Walk up to the <Modal> element rendered by react-aria-components
    const modal = modalContent.closest('[class*="react-aria-Modal"]');
    if (!modal) {
      throw new Error("Modal root element not found");
    }
    expect(modal).toHaveAttribute("id", "modal-root");
  },
};
