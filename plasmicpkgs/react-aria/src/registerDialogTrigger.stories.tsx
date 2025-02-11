import { PlasmicCanvasContext } from "@plasmicapp/host";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import React, { useEffect, useState } from "react";
import { BaseButton } from "./registerButton";
import { BaseDialog } from "./registerDialog";
import { BaseDialogTrigger } from "./registerDialogTrigger";
import { BaseModal } from "./registerModal";
import { BasePopover } from "./registerPopover";

const meta: Meta<typeof BaseDialogTrigger> = {
  title: "Components/BaseDialogTrigger",
  component: BaseDialogTrigger,
  args: {
    onOpenChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof BaseDialogTrigger>;

const DefaultContent = () => (
  <div data-testid="dialog-content">
    <h2>Dialog Title</h2>
    <p>Dialog content goes here</p>
  </div>
);

export const WithModal: Story = {
  args: {
    isOpen: false,
    trigger: <BaseButton>Open modal</BaseButton>,
    dialog: (
      <BaseModal isDismissable={true} isKeyboardDismissDisabled={false}>
        <BaseDialog>
          <DefaultContent />
        </BaseDialog>
      </BaseModal>
    ),
  },
  render: ({ isOpen, onOpenChange, ...args }) => {
    const [open, setOpen] = useState(isOpen);
    return (
      <BaseDialogTrigger
        isOpen={open}
        onOpenChange={(newValue) => {
          setOpen(newValue);
          onOpenChange?.(newValue);
        }}
        {...args}
      />
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const doc = within(document.body);
    const button = canvas.getByText("Open modal");

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    await userEvent.click(button);

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).toBeInTheDocument();
    });

    await userEvent.click(document.body);

    // Modal should close
    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    // With keyboard navigation, press Escape to dismiss
    await userEvent.click(button);

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).toBeInTheDocument();
    });

    await userEvent.keyboard("{Escape}");
    // dialog should close
    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    expect(args.onOpenChange).toHaveBeenCalledTimes(4);
  },
};

export const WithPopover: Story = {
  args: {
    isOpen: false,
    trigger: <BaseButton>Open popover</BaseButton>,
    dialog: (
      <BasePopover isKeyboardDismissDisabled={false}>
        <BaseDialog>
          <DefaultContent />
        </BaseDialog>
      </BasePopover>
    ),
  },
  render: ({ isOpen, onOpenChange, ...args }) => {
    const [open, setOpen] = useState(isOpen);
    return (
      <BaseDialogTrigger
        isOpen={open}
        onOpenChange={(newValue) => {
          setOpen(newValue);
          onOpenChange?.(newValue);
        }}
        {...args}
      />
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const doc = within(document.body);
    const button = canvas.getByText("Open popover");

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    await userEvent.click(button);

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).toBeInTheDocument();
    });

    await userEvent.click(document.body);

    // popover should close
    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    // With keyboard navigation, press Escape to dismiss
    await userEvent.click(button);

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).toBeInTheDocument();
    });

    await userEvent.keyboard("{Escape}");
    // dialog should close
    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    expect(args.onOpenChange).toHaveBeenCalledTimes(4);
  },
};

export const WithPopoverNonModal: Story = {
  args: {
    isOpen: false,
    trigger: <BaseButton>Open popover</BaseButton>,
    dialog: (
      <BasePopover isNonModal={true} isKeyboardDismissDisabled={false}>
        <BaseDialog>
          <DefaultContent />
        </BaseDialog>
      </BasePopover>
    ),
  },
  render: ({ isOpen, onOpenChange, ...args }) => {
    const [open, setOpen] = useState(isOpen);
    return (
      <BaseDialogTrigger
        isOpen={open}
        onOpenChange={(newValue) => {
          setOpen(newValue);
          onOpenChange?.(newValue);
        }}
        {...args}
      />
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const doc = within(document.body);
    const button = canvas.getByText("Open popover");

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    await userEvent.click(button);

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).toBeInTheDocument();
    });

    await userEvent.click(document.body);

    // popover should close
    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).toBeInTheDocument();
    });

    await userEvent.keyboard("{Escape}");
    // dialog should close
    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    expect(args.onOpenChange).toHaveBeenCalledTimes(2);
  },
};

export const SelectedInCanvas: Story = {
  args: {
    isOpen: false,
    trigger: <BaseButton>Open popover</BaseButton>,
    dialog: (
      <BasePopover isNonModal={true} isKeyboardDismissDisabled={false}>
        <BaseDialog>
          <DefaultContent />
        </BaseDialog>
      </BasePopover>
    ),
  },
  render: ({ __plasmic_selection_prop__, isOpen, onOpenChange, ...args }) => {
    const [selected, setSelected] = useState(false);
    const [selectedSlotName, setSelectedSlotName] = useState("");
    const [open, setOpen] = useState(isOpen);
    useEffect(() => {
      setTimeout(() => {
        setSelected(true);
        setTimeout(() => {
          // Simulate trigger slot selection in Plasmic canvas
          setSelectedSlotName("trigger");
        }, 1000);
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
        <BaseDialogTrigger
          isOpen={open}
          onOpenChange={(newValue) => {
            setOpen(newValue);
            onOpenChange?.(newValue);
          }}
          // Simulate node selection in Plasmic canvas
          __plasmic_selection_prop__={{
            isSelected: selected,
            selectedSlotName,
          }}
          {...args}
        />
      </PlasmicCanvasContext.Provider>
    );
  },
  play: async ({ args }) => {
    // popovers are rendered outside canvas, so we need to use document.body
    const doc = within(document.body);

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(doc.queryByTestId("dialog-content")).toBeInTheDocument();
      },
      { timeout: 1100 }
    );

    await waitFor(
      () => {
        expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
      },
      { timeout: 1100 }
    ); // the slot selected is trigger, so the popover should close

    expect(args.onOpenChange).toHaveBeenCalledTimes(2);
  },
};
