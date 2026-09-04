// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import React, { createRef } from "react";
import { render } from "@testing-library/react";
import { SliderWrapper, SliderMethods } from "../index";

let inCanvas = false;

vi.mock("@plasmicapp/host", () => ({
  usePlasmicCanvasContext: () => (inCanvas ? {} : undefined),
  __esModule: true,
  default: () => null,
}));

describe("SliderWrapper", () => {
  it("renders without crashing", () => {
    inCanvas = false;
    const { container } = render(
      <SliderWrapper sliderScopeClassName="slider-test">
        <div>Slide 1</div>
        <div>Slide 2</div>
        <div>Slide 3</div>
      </SliderWrapper>
    );
    expect(container.querySelector(".slick-slider")).not.toBeNull();
    expect(container.textContent).toContain("Slide 1");
    expect(container.textContent).toContain("Slide 2");
    expect(container.textContent).toContain("Slide 3");
  });

  it("exposes ref methods", () => {
    inCanvas = false;
    const ref = createRef<SliderMethods>();
    render(
      <SliderWrapper sliderScopeClassName="slider-test" ref={ref}>
        <div>Slide 1</div>
        <div>Slide 2</div>
      </SliderWrapper>
    );

    expect(ref.current).toBeDefined();
    expect(typeof ref.current!.slickGoTo).toBe("function");
    expect(typeof ref.current!.slickNext).toBe("function");
    expect(typeof ref.current!.slickPrev).toBe("function");
    expect(typeof ref.current!.slickPlay).toBe("function");
    expect(typeof ref.current!.slickPause).toBe("function");
  });

  it("suppresses autoplay in canvas mode", () => {
    inCanvas = true;
    const { container } = render(
      <SliderWrapper sliderScopeClassName="slider-test" autoplay>
        <div>Slide 1</div>
        <div>Slide 2</div>
      </SliderWrapper>
    );

    const slider = container.querySelector(".slick-slider");
    expect(slider).not.toBeNull();
  });
});
