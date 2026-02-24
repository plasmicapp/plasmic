import { PlasmicCanvasContext } from "@plasmicapp/host";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import React, { useState } from "react";
import { BaseButton } from "./registerButton";
import { BaseTooltip } from "./registerTooltip";

const meta: Meta<typeof BaseTooltip> = {
  title: "Components/BaseTooltip",
  component: BaseTooltip,
  args: {
    onOpenChange: fn(),
    children: <span>Show tooltip</span>, // anything can be used as a trigger
    tooltipContent: <div data-testid="tooltip-content">This is a tooltip</div>,
    trigger: undefined, // means that it triggers on both focus and hover
    delay: 0,
    closeDelay: 0,
  },
};

export default meta;
type Story = StoryObj<typeof BaseTooltip>;

// Basic tooltip with hover trigger
export const Basic: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByText("Show tooltip");

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    await userEvent.hover(trigger);

    // Check that tooltip appears
    await waitFor(() => {
      const tooltip = within(document.body).getByTestId("tooltip-content");
      const tooltipId = tooltip.parentElement?.getAttribute("id");
      expect(tooltipId).toBeDefined();
      expect(trigger.parentElement?.getAttribute("aria-describedby")).toEqual(
        tooltipId
      );
    });

    expect(args.onOpenChange).toHaveBeenCalledWith(true);

    await userEvent.unhover(trigger);

    await waitFor(() => expect(args.onOpenChange).toHaveBeenCalledWith(false));
    expect(args.onOpenChange).toHaveBeenCalledTimes(2);

    await userEvent.tab();

    // Non-focusable elements should still not be focusable when used as a tooltip trigger
    await expect(trigger).not.toHaveFocus();
    expect(args.onOpenChange).toHaveBeenCalledTimes(2); // no change
  },
};

// Test only that the tooltip renders initially
export const AlwaysOpen: Story = {
  args: {
    isOpen: true, // Force tooltip to be open
  },
  play: async () => {
    // Just verify the tooltip content is in the document
    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).toBeInTheDocument()
    );
  },
};

// Tooltip with focus trigger
export const FocusTrigger: Story = {
  args: {
    // TabIndex=0 makes it focusable
    children: <span tabIndex={0}>Show tooltip</span>, // anything can be used as a trigger
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByText("Show tooltip");
    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    // Focus trigger
    await userEvent.tab();

    await expect(trigger).toHaveFocus();

    // Check that tooltip appears
    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).toBeInTheDocument()
    );

    expect(args.onOpenChange).toHaveBeenCalledWith(true);

    // Move focus away
    await userEvent.tab();
    await expect(trigger).not.toHaveFocus();

    await waitFor(() => expect(args.onOpenChange).toHaveBeenCalledWith(false));
  },
};

const CustomButton = ({ children, ...props }: any) => {
  return (
    <div {...props} data-testid="trigger-wrapper">
      <span tabIndex={0}>{children}</span>
      <span tabIndex={0}>{children}</span>
    </div>
  );
};
export const WithoutForwardRefTrigger: Story = {
  args: {
    children: <CustomButton>Show tooltip</CustomButton>,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const triggerWrapper = canvas.getByTestId("trigger-wrapper");
    const innerFocusableButtons = canvas.getAllByText("Show tooltip");

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    await expect(innerFocusableButtons[0]).not.toHaveFocus();

    // Focus trigger
    await userEvent.tab();
    expect(innerFocusableButtons[0]).toHaveFocus(); // ensure that the focus is on the first focusable item in the trigger wrapper

    // Check that tooltip appears
    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).toBeInTheDocument()
    );

    expect(args.onOpenChange).toHaveBeenCalledWith(true);

    // Move focus away
    await userEvent.tab();
    expect(innerFocusableButtons[0]).not.toHaveFocus();
    expect(innerFocusableButtons[1]).toHaveFocus();
    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).toBeInTheDocument()
    );

    await userEvent.tab();
    expect(innerFocusableButtons[1]).not.toHaveFocus();
    await waitFor(() => expect(args.onOpenChange).toHaveBeenCalledWith(false)); //ensure that tooltip is no longer open
    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    // should also work with hover
    await userEvent.hover(triggerWrapper);

    // Check that tooltip appears
    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).toBeInTheDocument()
    );

    await waitFor(() => expect(args.onOpenChange).toHaveBeenCalledWith(true)); // ensure the tooltip has opened

    await userEvent.unhover(triggerWrapper);

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    await waitFor(() => expect(args.onOpenChange).toHaveBeenCalledWith(false));
  },
};

// Tooltip with focus trigger only
export const FocusTriggerOnly: Story = {
  args: {
    trigger: "focus",
    children: <span tabIndex={0}>Show tooltip</span>, // anything can be used as a trigger
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByText("Show tooltip");

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    // Hover over trigger
    await userEvent.hover(trigger);

    // Check that tooltip does NOT appear on hover
    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    expect(args.onOpenChange).not.toHaveBeenCalled();

    // Move mouse away
    await userEvent.unhover(trigger);

    // Focus trigger
    await userEvent.tab();
    await expect(trigger).toHaveFocus();

    // Check that tooltip DOES appear on focus
    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).toBeInTheDocument()
    );

    expect(args.onOpenChange).toHaveBeenCalledWith(true);

    // Move focus away
    await userEvent.tab();
    await waitFor(() => expect(args.onOpenChange).toHaveBeenCalledWith(false));
  },
};

// Ensures that any custom event handlers on the trigger are called, and any custom props passed to it are passed through.
export const TriggerWithEventHandlers: Story = {
  parameters: {
    customOnFocus: fn(),
  },
  render: (args, { parameters }) => (
    <BaseTooltip {...args}>
      <button className="custom-class" onFocus={parameters.customOnFocus}>
        Show tooltip
      </button>
    </BaseTooltip>
  ),
  play: async ({ args, canvasElement, parameters }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByText("Show tooltip");

    await expect(trigger).toHaveClass("custom-class");

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    expect(parameters.customOnFocus).not.toHaveBeenCalled();
    // Focus trigger
    await userEvent.tab();
    await expect(trigger).toHaveFocus();

    // Check that tooltip DOES appear on focus
    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).toBeInTheDocument()
    );
    expect(parameters.customOnFocus).toHaveBeenCalled();

    expect(args.onOpenChange).toHaveBeenCalledWith(true);

    // Move focus away
    await userEvent.tab();
    await waitFor(() => expect(args.onOpenChange).toHaveBeenCalledWith(false));
  },
};

// Disabled tooltip
export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByText("Show tooltip");

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    // Focus trigger
    await userEvent.tab();

    // Check that the disabled tooltip does NOT appear
    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    expect(args.onOpenChange).not.toHaveBeenCalled();

    await userEvent.hover(trigger);
  },
};

export const Controlled: Story = {
  render: ({ isOpen: _isOpen, onOpenChange, ...args }) => {
    const [open, setOpen] = useState(false);

    return (
      <BaseTooltip
        {...args}
        isOpen={open}
        onOpenChange={(newVal) => {
          setOpen(newVal);
          onOpenChange?.(newVal);
        }}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByText("Show tooltip");

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    await userEvent.hover(trigger);

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).toBeInTheDocument()
    );

    await userEvent.unhover(trigger);

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );
  },
};

export const AriaButtonTrigger: Story = {
  args: {
    children: <BaseButton>Show tooltip</BaseButton>, // anything can be used as a trigger
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByText("Show tooltip");
    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    await userEvent.hover(trigger);

    // Check that tooltip appears
    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).toBeInTheDocument()
    );
    expect(args.onOpenChange).toHaveBeenCalledWith(true);
    expect(args.onOpenChange).toHaveBeenCalledTimes(1);

    await userEvent.unhover(trigger);

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );
    expect(args.onOpenChange).toHaveBeenCalledWith(false);
    expect(args.onOpenChange).toHaveBeenCalledTimes(2);

    await expect(trigger).not.toHaveFocus();

    // Focus trigger
    await userEvent.tab();
    expect(trigger).toHaveFocus();
    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).toBeInTheDocument()
    );
    expect(args.onOpenChange).toHaveBeenCalledWith(true);
    expect(args.onOpenChange).toHaveBeenCalledTimes(3);

    // Move focus away
    await userEvent.tab();
    await expect(canvas.getByText("Show tooltip")).not.toHaveFocus();

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    await waitFor(() => expect(args.onOpenChange).toHaveBeenCalledWith(false));
    expect(args.onOpenChange).toHaveBeenCalledTimes(4);
  },
};

export const SelectedInCanvas: Story = {
  render: ({ __plasmic_selection_prop__, ...args }) => {
    const [selected, setSelected] = useState(false);
    const [selectedSlotName, setSelectedSlotName] = useState("");

    return (
      // Simulate Plasmic canvas envirnment
      <PlasmicCanvasContext.Provider
        value={{
          componentName: "test",
          globalVariants: {},
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .trigger {
              display: inline-block;
            }
        `,
          }}
        />
        <BaseTooltip
          {...args}
          // Simulate node selection in Plasmic canvas
          __plasmic_selection_prop__={{
            isSelected: selected,
            selectedSlotName,
          }}
          className="trigger"
        />
        <button onClick={() => setSelected((prev) => !prev)}>
          Toggle selection
        </button>
        <button onClick={() => setSelectedSlotName("children")}>
          Select trigger
        </button>
        <button onClick={() => setSelectedSlotName("some other slot")}>
          Select other slot
        </button>
      </PlasmicCanvasContext.Provider>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggleSelectionBtn = canvas.getByText("Toggle selection");
    const triggerSelectionBtn = canvas.getByText("Select trigger");
    const otherSlotSelectionBtn = canvas.getByText("Select other slot");

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    await userEvent.click(toggleSelectionBtn); // select to open

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).toBeInTheDocument()
    );

    await userEvent.click(triggerSelectionBtn); // selecting trigger should close tooltip

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    await userEvent.click(otherSlotSelectionBtn); // selecting other slot should open tooltip

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).toBeInTheDocument()
    );

    await userEvent.click(toggleSelectionBtn); // un-select to close

    await waitFor(
      () =>
        expect(
          within(document.body).queryByTestId("tooltip-content")
        ).not.toBeInTheDocument(),
      { timeout: 1100 }
    );
  },
};

// Ensures that the tooltip is positioned relative to its trigger
export const TooltipPositionInCanvas: Story = {
  render: (args) => {
    const [className, setClassName] = useState<string | undefined>("trigger");
    const [selected, setSelected] = useState(false);

    return (
      <>
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .trigger {
              display: inline-block;
            }
          .trigger-right {
            position: absolute;
            right: 0;
          }
        `,
          }}
        />
        {/* Simulate Plasmic canvas envirnment */}
        <PlasmicCanvasContext.Provider
          value={{
            componentName: "test",
            globalVariants: {},
          }}
        >
          <button onClick={() => setClassName("trigger trigger-right")}>
            Move right
          </button>
          <button onClick={() => setClassName("trigger")}>Move back</button>
          <button onClick={() => setSelected((prev) => !prev)}>
            Toggle selection
          </button>
          <BaseTooltip
            {...args}
            className={className}
            __plasmic_selection_prop__={{
              isSelected: selected,
            }}
          />
        </PlasmicCanvasContext.Provider>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const moveRightBtn = canvas.getByText("Move right");
    const moveBackBtn = canvas.getByText("Move back");
    const toggleSelectionBtn = canvas.getByText("Toggle selection");

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    await userEvent.click(toggleSelectionBtn); // select to open

    const initialTooltipLeftPosition = await waitFor(() => {
      const tooltip = within(document.body).getByTestId("tooltip-content");
      return tooltip.getBoundingClientRect().left;
    });

    await userEvent.click(toggleSelectionBtn); // un-select to close

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    await userEvent.click(moveRightBtn);
    await userEvent.click(toggleSelectionBtn); // select to open

    await waitFor(() => {
      const tooltip = within(document.body).getByTestId("tooltip-content");
      expect(initialTooltipLeftPosition).not.toEqual(
        tooltip.getBoundingClientRect().left
      ); // opens at a different position because the position of the trigger changed
    });

    await userEvent.click(toggleSelectionBtn); // un-select to close

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    await userEvent.click(moveBackBtn); // move trigger back to initial position
    await userEvent.click(toggleSelectionBtn); // select to open

    await waitFor(() => {
      const tooltip = within(document.body).getByTestId("tooltip-content");
      expect(initialTooltipLeftPosition).toEqual(
        tooltip.getBoundingClientRect().left
      ); // opens at the initial position
    });

    await userEvent.click(toggleSelectionBtn); // un-select to close

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );
  },
};

// Ensures that the tooltip is positioned relative to its trigger
export const TooltipPositionInPreview: Story = {
  render: (args) => {
    const [className, setClassName] = useState<string | undefined>("trigger");

    return (
      <>
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .trigger {
              display: inline-block;
            }
          .trigger-right {
            position: absolute;
            right: 0;
          }
        `,
          }}
        />
        {/* Simulate Plasmic canvas envirnment */}
        <>
          <button onClick={() => setClassName("trigger trigger-right")}>
            Move right
          </button>
          <button onClick={() => setClassName("trigger")}>Move back</button>
          <BaseTooltip {...args} className={className} />
        </>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByText("Show tooltip");
    const moveRightBtn = canvas.getByText("Move right");
    const moveBackBtn = canvas.getByText("Move back");

    await userEvent.hover(trigger); // toggle open

    const initialTooltipLeftPosition = await waitFor(() => {
      const tooltip = within(document.body).getByTestId("tooltip-content");
      return tooltip.getBoundingClientRect().left;
    });

    await userEvent.unhover(trigger); // toggle close

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    await userEvent.click(moveRightBtn);
    await userEvent.hover(trigger); // toggle open

    await waitFor(() => {
      const tooltip = within(document.body).getByTestId("tooltip-content");
      expect(initialTooltipLeftPosition).not.toEqual(
        tooltip.getBoundingClientRect().left
      ); // opens at a different position because the position of the trigger changed
    });

    await userEvent.unhover(trigger); // toggle close

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );

    await userEvent.click(moveBackBtn); // move trigger back to initial position
    await userEvent.hover(trigger); // toggle open

    await waitFor(() => {
      const tooltip = within(document.body).getByTestId("tooltip-content");
      expect(initialTooltipLeftPosition).toEqual(
        tooltip.getBoundingClientRect().left
      ); // opens at the initial position
    });

    await userEvent.unhover(trigger); // toggle close

    await waitFor(() =>
      expect(
        within(document.body).queryByTestId("tooltip-content")
      ).not.toBeInTheDocument()
    );
  },
};
