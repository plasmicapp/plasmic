import { FormattedTimeText } from "@/wab/client/components/time/FormattedTimeText";
import { formatRelative } from "@/wab/shared/utils/date-utils";
import { act, render } from "@testing-library/react";
import * as React from "react";
import { Temporal } from "temporal-polyfill";

describe("FormattedTimeText", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates relative time each second", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));
    const value = Temporal.Instant.from("2026-07-15T12:00:01Z");
    const { container } = render(
      <FormattedTimeText value={value} format={formatRelative} />,
    );

    expect(container.textContent).toBe("in 1 second");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(container.textContent).toBe("now");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(container.textContent).toBe("1 second ago");
  });
});
