import { PlasmicCanvasContext } from "@plasmicapp/host";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import React, { useEffect, useState } from "react";
import { BaseButton } from "./registerButton";
import { BaseDialog } from "./registerDialog";
import { BaseDialogTrigger } from "./registerDialogTrigger";
import { BaseModal, BaseModalProps } from "./registerModal";
import { BasePopover, BasePopoverProps } from "./registerPopover";

const meta: Meta<typeof BaseDialogTrigger> = {
  title: "Components/BaseDialogTrigger",
  component: BaseDialogTrigger,
  args: {
    defaultOpen: false,
    onOpenChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof BaseDialogTrigger>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DefaultContent = () => (
  <div data-testid="dialog-content">
    <h2>Dialog Title</h2>
    <p>Dialog content goes here</p>
  </div>
);

const DefaultPopoverContent = (props: BasePopoverProps) => (
  <BasePopover {...props}>
    <BaseDialog>
      <DefaultContent />
    </BaseDialog>
  </BasePopover>
);

const DefaultModalContent = (props: BaseModalProps) => (
  <BaseModal {...props}>
    <BaseDialog>
      <DefaultContent />
    </BaseDialog>
  </BaseModal>
);

export const WithModal: Story = {
  args: {
    trigger: <span tabIndex={0}>Open modal</span>, // anything can be used as a trigger
    dialog: (
      <DefaultModalContent
        isDismissable={true}
        isKeyboardDismissDisabled={false}
      />
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const doc = within(document.body);
    const trigger = canvas.getByText("Open modal");

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    await userEvent.click(trigger);

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).toBeInTheDocument();
    });

    await userEvent.click(document.body);

    // Modal should close
    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    // With keyboard navigation
    await userEvent.tab();
    expect(trigger).toHaveFocus();

    // Still not open because a click/press is required
    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    await userEvent.keyboard("[Space]");

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).toBeInTheDocument();
    });

    // press Escape to dismiss
    await userEvent.keyboard("{Escape}");
    // dialog should close
    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    expect(args.onOpenChange).toHaveBeenCalledTimes(4);
  },
};

// Ensures that any custom event handlers on the trigger are called, and any custom props passed to it are passed through.
export const TriggerWithCustomEventHandler: Story = {
  args: {
    dialog: (
      <DefaultModalContent
        isDismissable={true}
        isKeyboardDismissDisabled={false}
      />
    ),
  },
  parameters: {
    customOnClick: fn(),
  },
  render: (args, { parameters }) => {
    return (
      <BaseDialogTrigger
        {...args}
        trigger={
          <span className="custom-class" onClick={parameters.customOnClick}>
            Open modal
          </span>
        }
      />
    );
  },
  play: async ({ canvasElement, args, parameters }) => {
    const canvas = within(canvasElement);
    const doc = within(document.body);
    const trigger = canvas.getByText("Open modal");

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    expect(trigger).toHaveClass("custom-class");

    expect(parameters.customOnClick).toHaveBeenCalledTimes(0);
    await userEvent.click(trigger);
    expect(parameters.customOnClick).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).toBeInTheDocument();
    });

    await userEvent.click(document.body);

    // Modal should close
    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    expect(args.onOpenChange).toHaveBeenCalledTimes(2);
  },
};

// tests that a trigger that's nested in a div (e.g. a <span>) can trigger open the dialog on click
// Also tests that either of nested triggers can be made non-triggerable via e.stopPropagation
export const WithNestedTrigger: Story = {
  args: {
    dialog: (
      <DefaultModalContent
        isDismissable={true}
        isKeyboardDismissDisabled={false}
      />
    ),
    trigger: (
      <div>
        <span tabIndex={0}>Open modal</span>
        <span tabIndex={0} onClick={(e) => e.stopPropagation()}>
          Open modal
        </span>
        <span tabIndex={0}>Open modal</span>
      </div>
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const doc = within(document.body);
    const triggers = canvas.getAllByText("Open modal");

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    await userEvent.click(triggers[0]);

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).toBeInTheDocument();
    });

    // Click again to dismiss
    await userEvent.click(triggers[0]);

    // Modal should close
    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    expect(args.onOpenChange).toHaveBeenCalledTimes(2);

    await userEvent.click(triggers[1]);

    // trigger # 2 stops propagation via e.stopPropagation. So, clicking on trigger # 2 should not open the dialog
    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    expect(args.onOpenChange).toHaveBeenCalledTimes(2); // not changed

    await userEvent.click(triggers[2]);

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).toBeInTheDocument();
    });
    expect(args.onOpenChange).toHaveBeenCalledTimes(3);

    await userEvent.keyboard("{Escape}");
    expect(args.onOpenChange).toHaveBeenCalledTimes(4);
    await userEvent.click(triggers[2]);
    expect(args.onOpenChange).toHaveBeenCalledTimes(5);
  },
};

export const WithPopover: Story = {
  args: {
    trigger: <span tabIndex={0}>Open popover</span>, // anything can be used as a trigger
    dialog: <DefaultPopoverContent isKeyboardDismissDisabled={false} />,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const doc = within(document.body);
    const trigger = canvas.getByText("Open popover");

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    await userEvent.click(trigger);

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).toBeInTheDocument();
    });

    await userEvent.click(document.body);

    // popover should close
    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    // With keyboard navigation, press Space to open and Escape to dismiss
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard("[Space]");

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
    trigger: <span>Open popover</span>, // anything can be used as a trigger
    dialog: (
      <DefaultPopoverContent
        isNonModal={true}
        isKeyboardDismissDisabled={false}
      />
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const doc = within(document.body);
    const trigger = canvas.getByText("Open popover");

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    await userEvent.click(trigger);

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).toBeInTheDocument();
    });

    await userEvent.click(document.body);

    // popover should NOT close, because the outside can be interacted with without affecting the popover's open state
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

export const ControlledDialog: Story = {
  args: {
    trigger: undefined,
    dialog: <DefaultPopoverContent />,
  },
  render: ({ isOpen, dialog }) => {
    const [open, setOpen] = useState(isOpen);
    return (
      <>
        <span onClick={() => setOpen((prev) => !prev)}>Toggle</span>
        <BaseDialogTrigger
          isOpen={open}
          onOpenChange={setOpen}
          dialog={dialog}
        />
      </>
    );
  },
  play: async ({ canvasElement }) => {
    // popovers are rendered outside canvas, so we need to use document.body
    const doc = within(document.body);
    const canvas = within(canvasElement);
    const trigger = canvas.getByText("Toggle");

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    await trigger.click();

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).toBeInTheDocument();
    });

    await trigger.click();

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });
  },
};

export const AriaButtonTrigger: Story = {
  args: {
    dialog: <DefaultModalContent isDismissable={true} />,
    trigger: <BaseButton>Open modal</BaseButton>,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const doc = within(document.body);
    const trigger = canvas.getByText("Open modal");

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    await userEvent.click(trigger);

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).toBeInTheDocument();
    });

    await userEvent.click(document.body);

    // Modal should close
    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    expect(args.onOpenChange).toHaveBeenCalledTimes(2);
  },
};

export const SelectedInCanvas: Story = {
  args: {
    trigger: undefined,
    dialog: <DefaultPopoverContent isKeyboardDismissDisabled={false} />,
  },
  render: ({ __plasmic_selection_prop__, ...args }) => {
    const [selected, setSelected] = useState(false);
    const [selectedSlotName, setSelectedSlotName] = useState("");
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
  play: async () => {
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
  },
};

export const PopoverPosition: Story = {
  args: {
    trigger: <span>Open popover</span>, // anything can be used as a trigger
    dialog: <DefaultPopoverContent />,
  },
  render: (args) => {
    const [className, setClassName] = useState<string | undefined>("popover");
    useEffect(() => {
      setTimeout(() => {
        setClassName((prev) => `${prev} popover-right`);
      }, 1000);
    }, []);

    return (
      <>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .popover {
                display: inline-block;
              }
              .popover-right {
                position: absolute;
                right: 0;
              }
            `,
          }}
        />
        <BaseDialogTrigger {...args} className={className} />
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const doc = within(document.body);
    const trigger = canvas.getByText("Open popover");

    await waitFor(() => {
      expect(doc.queryByTestId("dialog-content")).not.toBeInTheDocument();
    });

    await userEvent.click(trigger);

    let initialPopoverLeftPosition: number;

    // Check that tooltip appears
    await waitFor(() => {
      const popover = doc.getByTestId("dialog-content");
      initialPopoverLeftPosition = popover.getBoundingClientRect().left;
    });

    await userEvent.click(trigger); // toggle close

    await sleep(500);
    await userEvent.click(trigger);

    await waitFor(async () => {
      const popover = doc.getByTestId("dialog-content");
      expect(initialPopoverLeftPosition).toEqual(
        popover.getBoundingClientRect().left
      ); // opens again at exactly the same position
    });

    await userEvent.click(trigger); // toggle close

    await sleep(500);
    await userEvent.click(trigger);

    await waitFor(() => {
      const popover = doc.getByTestId("dialog-content");
      expect(initialPopoverLeftPosition).not.toEqual(
        popover.getBoundingClientRect().left
      ); // opens at a different position because the position of the trigger changed
    });
  },
};
