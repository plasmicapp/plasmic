import { isDimensionNode } from "@/wab/shared/css/css-tree-utils";
import { joinCssValues, splitCssValue } from "@/wab/shared/css/parse";
import { AnimationParams } from "@/wab/shared/model/classes";
import { generate, parse } from "css-tree";

/**
 * List of CSS animation sub-properties (excludes the shorthand "animation")
 */
export const animationSubPropertiesStyleKeys = [
  "animation-name",
  "animation-duration",
  "animation-timing-function",
  "animation-delay",
  "animation-iteration-count",
  "animation-direction",
  "animation-fill-mode",
  "animation-play-state",
] as const;

/**
 * List of CSS animation-related properties
 */
export const animationStyleKeys = [
  "animation",
  ...animationSubPropertiesStyleKeys,
] as const;
export type AnimationProperty = (typeof animationStyleKeys)[number];

export function isAnimationProperty(value: string) {
  return animationStyleKeys.includes(value as AnimationProperty);
}

function isAnimationKeyword(value: string) {
  return (
    isTimingFunctionKeyword(value) ||
    isAnimationDirectionKeyword(value) ||
    isFillModeKeyword(value) ||
    isPlayStateKeyword(value) ||
    value === "infinite"
  );
}

export const timingFunctionKeywords = [
  "linear",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "step-start",
  "step-end",
] as const;

export type TimingFunctionKeyword = (typeof timingFunctionKeywords)[number];
function isTimingFunctionKeyword(
  value: string
): value is TimingFunctionKeyword {
  return timingFunctionKeywords.includes(value as TimingFunctionKeyword);
}

export const animationDirectionKeywords = [
  "normal",
  "reverse",
  "alternate",
  "alternate-reverse",
] as const;
export type AnimationDirectionKeyword =
  (typeof animationDirectionKeywords)[number];

function isAnimationDirectionKeyword(
  value: string
): value is AnimationDirectionKeyword {
  return animationDirectionKeywords.includes(
    value as AnimationDirectionKeyword
  );
}

export const fillModeKeywords = [
  "none",
  "forwards",
  "backwards",
  "both",
] as const;
export type FillModeKeyword = (typeof fillModeKeywords)[number];

function isFillModeKeyword(value: string): value is FillModeKeyword {
  return fillModeKeywords.includes(value as FillModeKeyword);
}

export const playStateKeywords = ["running", "paused"] as const;
export type PlayStateKeyword = (typeof playStateKeywords)[number];

function isPlayStateKeyword(value: string): value is PlayStateKeyword {
  return playStateKeywords.includes(value as PlayStateKeyword);
}

export type CssAnimation = Omit<AnimationParams, "sequence"> & {
  name: string;
};

export function parseCssAnimation(value: string): CssAnimation | null {
  const valueAst = parse(value, { context: "value" });
  if (valueAst.type !== "Value") {
    return null;
  }

  let name: string = "";
  let duration: string = "0s";
  let timingFunction: TimingFunctionKeyword = "ease";
  let delay: string = "0s";
  let iterationCount: string = "1";
  let direction: AnimationDirectionKeyword = "normal";
  let fillMode: FillModeKeyword = "none";
  let playState: PlayStateKeyword = "running";

  const nodes = valueAst.children.toArray();
  let timeValueCount = 0;

  for (const node of nodes) {
    if (node.type === "Identifier") {
      const identifierName = node.name;

      // Animation name (if not a keyword)
      if (!isAnimationKeyword(identifierName) && !name) {
        name = identifierName;
      }
      // Timing function keywords
      else if (isTimingFunctionKeyword(identifierName)) {
        timingFunction = identifierName;
      }
      // Direction keywords
      else if (isAnimationDirectionKeyword(identifierName)) {
        direction = identifierName;
      }
      // Fill mode keywords
      else if (isFillModeKeyword(identifierName)) {
        fillMode = identifierName;
      }
      // Play state keywords
      else if (isPlayStateKeyword(identifierName)) {
        playState = identifierName;
      }
      // Iteration count keywords
      else if (identifierName === "infinite") {
        iterationCount = identifierName;
      }
    } else if (node.type === "Function") {
      // Timing functions like cubic-bezier() or steps() not supported yet.
    } else if (isDimensionNode(node)) {
      const nodeValue = generate(node);

      if (
        node.type === "Dimension" &&
        (node.unit === "s" || node.unit === "ms")
      ) {
        // Time values: first occurrence is duration, second is delay
        if (timeValueCount === 0) {
          duration = nodeValue;
        } else if (timeValueCount === 1) {
          delay = nodeValue;
        }

        timeValueCount++;
      } else if (node.type === "Number") {
        // Iteration count
        iterationCount = nodeValue;
      }
    }
  }

  return {
    name,
    duration,
    timingFunction,
    delay,
    iterationCount,
    direction,
    fillMode,
    playState,
  };
}

export function showCssAnimation(animation: CssAnimation): string {
  const parts = [
    animation.name,
    animation.duration, // animation-duration (required)
    animation.timingFunction || "ease", // animation-timing-function
    animation.delay || "0s", // animation-delay
    animation.iterationCount || "1", // animation-iteration-count
    animation.direction, // animation-direction
    animation.fillMode || "none", // animation-fill-mode
    animation.playState,
  ];

  return parts.join(" ");
}

export function parseCssAnimations(value: string): CssAnimation[] | null {
  if (!value) {
    return null;
  }

  if (value.trim() === "none") {
    return [];
  }

  // Split by commas to handle multiple animations
  const animationValues = splitCssValue("animation", value);

  const animations: CssAnimation[] = [];
  for (const animationValue of animationValues) {
    const animation = parseCssAnimation(animationValue);
    if (animation) {
      animations.push(animation);
    }
  }

  return animations;
}

export function showCssAnimations(animations: CssAnimation[]): string {
  return joinCssValues("animation", animations.map(showCssAnimation));
}

export function parseCssAnimationsFromStyles(
  styles: Record<AnimationProperty, string>
): CssAnimation[] | null {
  return parseCssAnimations(styles.animation);
}
