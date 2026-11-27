import { TimeTooltip } from "@/wab/client/components/time/TimeTooltip";
import { ExactTimePlayground } from "@/wab/client/components/time/__testonly__/ExactTimePlayground";
import { HoverableTime } from "@/wab/client/components/time/__testonly__/HoverableTime";
import {
  formatDateFullTimeShort,
  formatDateMediumTimeShort,
  formatDateShortTimeShort,
  formatZoneShort,
  localTimeZone,
} from "@/wab/shared/utils/date-utils";
import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { Temporal } from "temporal-polyfill";

export default {
  component: TimeTooltip,
  decorators: [
    (Story) => (
      <HoverableTime>
        <Story />
      </HoverableTime>
    ),
  ],
} as Meta<typeof TimeTooltip>;

type Story = StoryObj<typeof TimeTooltip>;

export const Playground: Story = {
  render: () => (
    <ExactTimePlayground initialTimeZone="Pacific/Fiji">
      {({ zoned }) => (
        <div style={{ display: "flex", gap: 32 }}>
          <TimeTooltip value={zoned.toInstant()}>Instant</TimeTooltip>
          <TimeTooltip value={zoned}>ZonedDateTime</TimeTooltip>
        </div>
      )}
    </ExactTimePlayground>
  ),
};

const NOW = Temporal.Now.instant().round({
  smallestUnit: "second",
  roundingMode: "floor",
});
const NOW_FIJI = NOW.toZonedDateTimeISO("Pacific/Fiji");

export const Instant: Story = {
  args: {
    value: NOW,
    children: formatDateMediumTimeShort(NOW),
  },
  play: async ({ canvasElement }) => {
    const time = within(canvasElement).getByText(
      formatDateMediumTimeShort(NOW),
    );
    await expect(time.tagName).toEqual("TIME");
    await expect(time.getAttribute("datetime")).toEqual(NOW.toString());
    await userEvent.tab();
    await expect(time).toHaveFocus();
    await expect(getComputedStyle(time).boxShadow).not.toEqual("none");
    const tooltip = await waitFor(() => screen.getByRole("tooltip"));
    await waitFor(() => expect(tooltip).toBeVisible());
    const details = within(tooltip).getByRole("group");
    await expect(time).toHaveAttribute("aria-describedby", details.id);
    const utcDate = formatDateFullTimeShort(NOW, "UTC");
    await expect(details.getAttribute("aria-label")).toContain(
      `${utcDate}, UTC`,
    );
    await expect(within(tooltip).getByText(utcDate)).toBeVisible();
    await expect(within(tooltip).getByText("Relative")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );
    await expect(time).toHaveFocus();
    time.blur();
    await userEvent.click(time);
    await expect(time).toHaveFocus();
    await expect(getComputedStyle(time).boxShadow).toEqual("none");
    time.blur();
  },
};

export const ZonedDateTime: Story = {
  args: {
    value: NOW_FIJI,
    children: formatDateShortTimeShort(NOW_FIJI),
  },
  play: async ({ canvasElement }) => {
    await userEvent.hover(
      within(canvasElement).getByText(formatDateShortTimeShort(NOW_FIJI)),
    );
    const tooltip = await waitFor(() => screen.getByRole("tooltip"));
    await waitFor(() => expect(tooltip).toBeVisible());
    const description = within(tooltip)
      .getByRole("group")
      .getAttribute("aria-label");
    const fijiDate = formatDateFullTimeShort(NOW_FIJI, "Pacific/Fiji");
    const utcDate = formatDateFullTimeShort(NOW, "UTC");
    // The accessible description pairs each value with its label in row order.
    await expect(description).toContain(`, Relative. ${fijiDate}, GMT+12. `);
    await expect(description?.endsWith(`${utcDate}, UTC`)).toBe(true);
    await expect(within(tooltip).getByText(fijiDate)).toBeVisible();
    await expect(within(tooltip).getByText(utcDate)).toBeVisible();
    const localZone = localTimeZone();
    if (localZone !== "UTC") {
      await expect(
        within(tooltip).getByText(
          `${formatZoneShort(NOW.toZonedDateTimeISO(localZone))} (your time)`,
        ),
      ).toBeVisible();
    }
  },
};
