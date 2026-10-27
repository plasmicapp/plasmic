// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import React, { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SliderMethods, SliderWrapper } from "../index";

let inCanvas = false;

vi.mock("@plasmicapp/host", () => ({
  usePlasmicCanvasContext: () => (inCanvas ? {} : undefined),
}));

function renderSlider(props: { autoplay?: boolean } = {}) {
  const ref = createRef<SliderMethods>();
  const beforeChange = vi.fn();
  const { container } = render(
    <SliderWrapper
      sliderScopeClassName="slider-test"
      ref={ref}
      beforeChange={beforeChange}
      autoplaySpeed={100}
      {...props}
    >
      <div>Slide 1</div>
      <div>Slide 2</div>
      <div>Slide 3</div>
    </SliderWrapper>,
  );
  return { container, ref, beforeChange };
}

describe("SliderWrapper", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders slides", () => {
    inCanvas = false;
    const { container } = renderSlider();
    expect(container.querySelector(".slick-slider.slider-test")).not.toBeNull();
    expect(container.textContent).toContain("Slide 3");
  });

  it("forwards ref methods to the slider", () => {
    inCanvas = false;
    const { ref, beforeChange } = renderSlider();
    act(() => {
      ref.current!.slickGoTo(2, true);
      vi.runAllTimers();
    });
    expect(beforeChange).toHaveBeenCalledWith(0, 2);
  });

  it.each([
    [false, 1],
    [true, 0],
  ])("inCanvas=%s autoplays %i times", (canvas, calls) => {
    inCanvas = canvas;
    const { beforeChange } = renderSlider({ autoplay: true });
    act(() => vi.advanceTimersByTime(150));
    expect(beforeChange).toHaveBeenCalledTimes(calls);
  });
});
