import {
  parseCssAnimation,
  parseCssAnimations,
  showCssAnimation,
  showCssAnimations,
} from "@/wab/shared/css/animations";

describe("animations", () => {
  describe("parseCssAnimation", () => {
    it("should parse basic animation with name and duration", () => {
      expect(parseCssAnimation("slideIn 1s")).toMatchObject({
        duration: "1s",
        timingFunction: "ease",
        delay: "0s",
        iterationCount: "1",
        direction: "normal",
        fillMode: "none",
        playState: "running",
        name: "slideIn",
      });
    });

    it("should parse animation with all properties", () => {
      expect(
        parseCssAnimation("fadeOut 2s ease-in 0.5s 3 alternate forwards paused")
      ).toMatchObject({
        duration: "2s",
        timingFunction: "ease-in",
        delay: "0.5s",
        iterationCount: "3",
        direction: "alternate",
        fillMode: "forwards",
        playState: "paused",
        name: "fadeOut",
      });
    });

    it("should parse animation with infinite iteration", () => {
      expect(parseCssAnimation("spin 1s linear infinite")).toMatchObject({
        duration: "1s",
        timingFunction: "linear",
        delay: "0s",
        iterationCount: "infinite",
        direction: "normal",
        fillMode: "none",
        playState: "running",
        name: "spin",
      });
    });

    it("should parse animation with milliseconds", () => {
      expect(parseCssAnimation("bounce 500ms ease-out 100ms")).toMatchObject({
        duration: "500ms",
        timingFunction: "ease-out",
        delay: "100ms",
        iterationCount: "1",
        direction: "normal",
        fillMode: "none",
        playState: "running",
        name: "bounce",
      });
    });

    it("should parse animation with direction keywords", () => {
      expect(parseCssAnimation("slide 1s reverse")).toMatchObject({
        duration: "1s",
        timingFunction: "ease",
        delay: "0s",
        iterationCount: "1",
        direction: "reverse",
        fillMode: "none",
        playState: "running",
        name: "slide",
      });
    });

    it("should parse animation with fill mode backwards", () => {
      expect(parseCssAnimation("appear 1s backwards")).toMatchObject({
        duration: "1s",
        timingFunction: "ease",
        delay: "0s",
        iterationCount: "1",
        direction: "normal",
        fillMode: "backwards",
        playState: "running",
        name: "appear",
      });
    });

    it("should parse animation with fill mode both", () => {
      expect(parseCssAnimation("transform 1s both")).toMatchObject({
        duration: "1s",
        timingFunction: "ease",
        delay: "0s",
        iterationCount: "1",
        direction: "normal",
        fillMode: "both",
        playState: "running",
        name: "transform",
      });
    });

    it("should parse animation with alternate-reverse direction", () => {
      expect(parseCssAnimation("wave 2s alternate-reverse")).toMatchObject({
        duration: "2s",
        timingFunction: "ease",
        delay: "0s",
        iterationCount: "1",
        direction: "alternate-reverse",
        fillMode: "none",
        playState: "running",
        name: "wave",
      });
    });

    it("should parse animation with step timing functions", () => {
      expect(parseCssAnimation("steps 1s step-start")).toMatchObject({
        duration: "1s",
        timingFunction: "step-start",
        delay: "0s",
        iterationCount: "1",
        direction: "normal",
        fillMode: "none",
        playState: "running",
        name: "steps",
      });
    });

    it("should parse animation with decimal iteration count", () => {
      expect(parseCssAnimation("pulse 1s 2.5")).toMatchObject({
        duration: "1s",
        timingFunction: "ease",
        delay: "0s",
        iterationCount: "2.5",
        direction: "normal",
        fillMode: "none",
        playState: "running",
        name: "pulse",
      });
    });

    it("should parse animation in different order", () => {
      expect(
        parseCssAnimation("myAnim ease-in-out 2s backwards infinite")
      ).toMatchObject({
        duration: "2s",
        timingFunction: "ease-in-out",
        delay: "0s",
        iterationCount: "infinite",
        direction: "normal",
        fillMode: "backwards",
        playState: "running",
        name: "myAnim",
      });
    });

    it("should parse animation with only duration (creates empty name)", () => {
      expect(parseCssAnimation("1s")).toMatchObject({
        name: "",
        duration: "1s",
      });
    });
  });

  describe("showCssAnimation", () => {
    it("should format basic animation", () => {
      expect(
        showCssAnimation({
          name: "slideIn",
          duration: "1s",
          timingFunction: "ease",
          delay: "0s",
          iterationCount: "1",
          direction: "normal",
          fillMode: "none",
          playState: "running",
        })
      ).toEqual("slideIn 1s ease 0s 1 normal none running");
    });

    it("should format animation with all properties", () => {
      expect(
        showCssAnimation({
          name: "fadeOut",
          duration: "2s",
          timingFunction: "ease-in",
          delay: "0.5s",
          iterationCount: "3",
          direction: "alternate",
          fillMode: "forwards",
          playState: "paused",
        })
      ).toEqual("fadeOut 2s ease-in 0.5s 3 alternate forwards paused");
    });

    it("should format animation with infinite iteration", () => {
      expect(
        showCssAnimation({
          name: "spin",
          duration: "1s",
          timingFunction: "linear",
          delay: "0s",
          iterationCount: "infinite",
          direction: "normal",
          fillMode: "none",
          playState: "running",
        })
      ).toEqual("spin 1s linear 0s infinite normal none running");
    });
  });

  describe("parseCssAnimations", () => {
    it("should parse single animation", () => {
      expect(parseCssAnimations("slideIn 1s")).toEqual([
        {
          duration: "1s",
          timingFunction: "ease",
          delay: "0s",
          iterationCount: "1",
          direction: "normal",
          fillMode: "none",
          playState: "running",
          name: "slideIn",
        },
      ]);
    });

    it("should parse multiple comma-separated animations", () => {
      expect(
        parseCssAnimations(
          "fadeIn 1s, slideUp 2s ease-in, rotate 3s linear infinite"
        )
      ).toEqual([
        {
          duration: "1s",
          timingFunction: "ease",
          delay: "0s",
          iterationCount: "1",
          direction: "normal",
          fillMode: "none",
          playState: "running",
          name: "fadeIn",
        },
        {
          duration: "2s",
          timingFunction: "ease-in",
          delay: "0s",
          iterationCount: "1",
          direction: "normal",
          fillMode: "none",
          playState: "running",
          name: "slideUp",
        },
        {
          duration: "3s",
          timingFunction: "linear",
          delay: "0s",
          iterationCount: "infinite",
          direction: "normal",
          fillMode: "none",
          playState: "running",
          name: "rotate",
        },
      ]);
    });

    it("should return empty array for 'none'", () => {
      expect(parseCssAnimations("none")).toEqual([]);
    });

    it("should return empty array for empty string", () => {
      expect(parseCssAnimations("")).toEqual(null);
    });
  });

  describe("showCssAnimations", () => {
    it("should format single animation", () => {
      expect(
        showCssAnimations([
          {
            name: "slideIn",
            duration: "1s",
            timingFunction: "ease",
            delay: "0s",
            iterationCount: "1",
            direction: "normal" as const,
            fillMode: "none" as const,
            playState: "running" as const,
          },
        ])
      ).toEqual("slideIn 1s ease 0s 1 normal none running");
    });

    it("should format multiple animations with comma separator", () => {
      expect(
        showCssAnimations([
          {
            name: "fadeIn",
            duration: "1s",
            timingFunction: "ease",
            delay: "0s",
            iterationCount: "1",
            direction: "normal" as const,
            fillMode: "none" as const,
            playState: "running" as const,
          },
          {
            name: "slideUp",
            duration: "2s",
            timingFunction: "ease-in",
            delay: "0s",
            iterationCount: "1",
            direction: "normal" as const,
            fillMode: "forwards" as const,
            playState: "running" as const,
          },
        ])
      ).toEqual(
        "fadeIn 1s ease 0s 1 normal none running, slideUp 2s ease-in 0s 1 normal forwards running"
      );
    });

    it("should format empty array", () => {
      expect(showCssAnimations([])).toEqual("");
    });
  });
});
