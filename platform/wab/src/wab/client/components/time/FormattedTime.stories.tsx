import { FormattedTime } from "@/wab/client/components/time/FormattedTime";
import { ExactTimePlayground } from "@/wab/client/components/time/__testonly__/ExactTimePlayground";
import { HoverableTime } from "@/wab/client/components/time/__testonly__/HoverableTime";
import { ensure } from "@/wab/shared/common";
import {
  ExactTime,
  formatDateFullTimeShort,
  formatDateMediumTimeShort,
  formatDateShortTimeShort,
  formatRelative,
} from "@/wab/shared/utils/date-utils";
import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { Temporal } from "temporal-polyfill";

export default {
  component: FormattedTime,
  decorators: [
    (Story) => (
      <HoverableTime>
        <Story />
      </HoverableTime>
    ),
  ],
} as Meta<typeof FormattedTime>;

type Story = StoryObj<typeof FormattedTime>;

const FORMATS = Object.entries({
  formatRelative,
  formatDateShortTimeShort,
  formatDateMediumTimeShort,
});

function AllFormats({ value }: { value: ExactTime }) {
  return (
    <table>
      <tbody>
        {FORMATS.map(([name, format]) => (
          <tr key={name}>
            <td style={{ paddingRight: 24, opacity: 0.7 }}>{name}</td>
            <td data-format={name}>
              <FormattedTime value={value} format={format} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function getTime(canvasElement: HTMLElement, name: string) {
  return ensure(
    canvasElement.querySelector(`[data-format="${name}"] time`),
    `${name} should render a <time>`,
  );
}

async function expectInlineFormats(
  canvasElement: HTMLElement,
  value: ExactTime,
) {
  for (const [name, format] of FORMATS) {
    await expect(getTime(canvasElement, name).textContent).toBe(format(value));
  }
}

export const Playground: Story = {
  render: () => (
    <ExactTimePlayground initialTimeZone="Pacific/Fiji" initialZoned={false}>
      {({ value }) => <AllFormats value={value} />}
    </ExactTimePlayground>
  ),
};

const INSTANT = Temporal.Instant.from("2026-07-15T12:00:00Z");

export const Instant: Story = {
  render: () => <AllFormats value={INSTANT} />,
  play: async ({ canvasElement }) => {
    await expectInlineFormats(canvasElement, INSTANT);

    const time = getTime(canvasElement, "formatRelative");
    await userEvent.hover(time);
    const tooltip = await waitFor(() => screen.getByRole("tooltip"));
    await waitFor(() => expect(tooltip).toBeVisible());
    await expect(
      within(tooltip).getAllByText(formatDateFullTimeShort(INSTANT))[0],
    ).toBeVisible();
    await expect(
      within(tooltip).queryByText("Relative"),
    ).not.toBeInTheDocument();
    await userEvent.unhover(time);
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  },
};

const ZONED = INSTANT.toZonedDateTimeISO("Pacific/Fiji");

export const ZonedDateTime: Story = {
  render: () => <AllFormats value={ZONED} />,
  play: async ({ canvasElement }) => {
    await expectInlineFormats(canvasElement, ZONED);
  },
};
