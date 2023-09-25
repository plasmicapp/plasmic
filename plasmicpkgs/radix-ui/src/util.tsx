import * as React from "react";
import { ReactElement, useState } from "react";
import { CodeComponentMeta } from "@plasmicapp/host";
import { DialogProps } from "@radix-ui/react-dialog";
import { omit, pick } from "remeda";

const DEBUG_SLOWDOWN = 1;

export const enterAnims = [
  "fade-in",
  "zoom-enter",
  "slide-in-from-top",
  "slide-in-from-right",
  "slide-in-from-bottom",
  "slide-in-from-left",
] as const;
export type EnterAnim = typeof enterAnims[number];
export const exitAnims = [
  "fade-out",
  "zoom-exit",
  "slide-out-to-top",
  "slide-out-to-right",
  "slide-out-to-bottom",
  "slide-out-to-left",
] as const;
export type ExitAnim = typeof exitAnims[number];
export type AnimName = EnterAnim | ExitAnim;

// https://github.com/reactwg/react-18/discussions/111#discussioncomment-1517837
let id = 0;
export const useId = (React as any).useId ?? (() => useState(() => "" + id++));

/** Allow attaching pseudoclasses and other CSS selectors to this unique component instance */
export const StyleWrapper = ({
  children,
  css,
}: {
  children: (dynClass: string | undefined) => ReactElement;
  css: string;
}) => {
  const dynClass = "pd__" + useId().replace(/:/g, "");
  return (
    <>
      {children(dynClass)}
      <style>{dynClass ? css.replace(/&/g, `.${dynClass}`) : ""}</style>
    </>
  );
};
export type AnimatedProps = {
  enterAnimations?: EnterAnim[];
  exitAnimations?: ExitAnim[];
  enterDuration?: number;
  exitDuration?: number;
  enterOpacity?: number;
  exitOpacity?: number;
  enterScale?: number;
  exitScale?: number;
  enterTranslateX?: string;
  exitTranslateX?: string;
  enterTranslateY?: string;
  exitTranslateY?: string;
  enterTiming?: string;
  exitTiming?: string;
  enterDelay?: number;
  exitDelay?: number;
};
export const Animated = ({
  children,
  enterAnimations = ["fade-in"],
  exitAnimations = ["fade-out"],
  enterDuration = 0.15 * DEBUG_SLOWDOWN,
  exitDuration = 0.15 * DEBUG_SLOWDOWN,
  enterOpacity = 0,
  exitOpacity = 0,
  enterScale = 0.95,
  exitScale = 0.95,
  enterTranslateX = "100%",
  exitTranslateX = "100%",
  enterTranslateY = "100%",
  exitTranslateY = "100%",
  enterTiming = "ease-out",
  exitTiming = "ease-out",
  enterDelay = 0,
  exitDelay = 0,
}: AnimatedProps & {
  children: (dynClass: string | undefined) => ReactElement;
}) => {
  const pct = (x: number | string) =>
    typeof x === "number" || x?.match(/.*\d$/) ? x + "%" : x;
  const neg = (x: string) => (x.startsWith("-") ? x : "-" + x);
  const animations: Record<AnimName, string> = {
    "fade-in": `--tw-enter-opacity: ${enterOpacity};`,
    "fade-out": `--tw-exit-opacity: ${exitOpacity};`,
    "slide-in-from-top": `--tw-enter-translate-y: ${neg(
      pct(enterTranslateY)
    )};`,
    "slide-out-to-top": `--tw-exit-translate-y: ${neg(pct(exitTranslateY))};`,
    "slide-in-from-right": `--tw-enter-translate-x: ${pct(enterTranslateX)};`,
    "slide-out-to-right": `--tw-exit-translate-x: ${pct(exitTranslateX)};`,
    "slide-in-from-bottom": `--tw-enter-translate-y: ${pct(enterTranslateY)};`,
    "slide-out-to-bottom": `--tw-exit-translate-y: ${pct(exitTranslateY)};`,
    "slide-in-from-left": `--tw-enter-translate-x: ${neg(
      pct(enterTranslateX)
    )};`,
    "slide-out-to-left": `--tw-exit-translate-x: ${neg(pct(exitTranslateX))};`,
    "zoom-enter": `--tw-enter-scale: ${enterScale};`,
    "zoom-exit": `--tw-exit-scale: ${exitScale};`,
  };
  return (
    <StyleWrapper
      css={`
        &[data-state="closed"] {
          animation-duration: ${exitDuration}s;
          animation-timing-function: ${exitTiming};
          animation-delay: ${exitDelay};
          ${exitAnimations
            .map((exitAnimation) => animations[exitAnimation] ?? "")
            .join(" ")}
        }
        &[data-state="open"] {
          animation-duration: ${enterDuration}s;
          animation-timing-function: ${enterTiming};
          animation-delay: ${enterDelay};
          ${enterAnimations
            .map((enterAnimation) => animations[enterAnimation] ?? "")
            .join(" ")}
        }
      `}
    >
      {children}
    </StyleWrapper>
  );
};

export function splitAnimProps<T extends AnimatedProps>(
  props: T
): [AnimatedProps, Omit<T, keyof AnimatedProps>] {
  const keys = [
    "enterAnimations",
    "exitAnimations",
    "enterDuration",
    "exitDuration",
    "enterTranslateX",
    "exitTranslateX",
    "enterTranslateY",
    "exitTranslateY",
    "enterTiming",
    "exitTiming",
    "enterDelay",
    "exitDelay",
    "enterScale",
    "exitScale",
    "enterOpacity",
    "exitOpacity",
  ] as const;
  const a = pick(props, keys);
  const b = omit(props, keys);
  return [a, b];
}

function mungeNames(names: readonly AnimName[]) {
  return names.map((name) => ({
    label: name.replace(/-/g, " "),
    value: name,
  }));
}

export const animPropTypes = ({
  defaultEnterAnimations,
  defaultExitAnimations,
}: {
  defaultEnterAnimations?: (ps: any) => EnterAnim[];
  defaultExitAnimations?: (ps: any) => ExitAnim[];
}): CodeComponentMeta<AnimatedProps>["props"] => {
  const getEnterAnimations = (ps: any) =>
    ps.enterAnimations ?? defaultEnterAnimations;
  const getExitAnimations = (ps: any) =>
    ps.exitAnimations ?? defaultExitAnimations;
  return {
    enterAnimations: {
      type: "choice",
      options: mungeNames(enterAnims),
      multiSelect: true,
      defaultValueHint: defaultEnterAnimations ?? ["fade-in"],
    },
    exitAnimations: {
      type: "choice",
      options: mungeNames(exitAnims),
      multiSelect: true,
      defaultValueHint: defaultExitAnimations ?? ["fade-out"],
    },
    enterDuration: { type: "number", defaultValueHint: 0.15 },
    exitDuration: { type: "number", defaultValueHint: 0.15 },
    enterTranslateX: {
      type: "string",
      defaultValueHint: "100%",
      hidden: (ps) =>
        !getEnterAnimations(ps)?.includes("slide-in-from-right") &&
        !getEnterAnimations(ps)?.includes("slide-in-from-left"),
    },
    exitTranslateX: {
      type: "string",
      defaultValueHint: "100%",
      hidden: (ps) =>
        !getExitAnimations(ps)?.includes("slide-out-to-right") &&
        !getExitAnimations(ps)?.includes("slide-out-to-left"),
    },
    enterTranslateY: {
      type: "string",
      defaultValueHint: "100%",
      hidden: (ps) =>
        !getEnterAnimations(ps)?.includes("slide-in-from-bottom") &&
        !getEnterAnimations(ps)?.includes("slide-in-from-top"),
    },
    exitTranslateY: {
      type: "string",
      defaultValueHint: "100%",
      hidden: (ps) =>
        !getExitAnimations(ps)?.includes("slide-out-to-bottom") &&
        !getExitAnimations(ps)?.includes("slide-out-to-top"),
    },
    enterOpacity: {
      type: "number",
      defaultValueHint: 0,
      hidden: (ps) => !getEnterAnimations(ps)?.includes("fade-in"),
    },
    exitOpacity: {
      type: "number",
      defaultValueHint: 0,
      hidden: (ps) => !getExitAnimations(ps)?.includes("fade-out"),
    },
    enterScale: {
      type: "number",
      defaultValueHint: 0.95,
      hidden: (ps) => !getEnterAnimations(ps)?.includes("zoom-enter"),
    },
    exitScale: {
      type: "number",
      defaultValueHint: 0.95,
      hidden: (ps) => !getExitAnimations(ps)?.includes("zoom-exit"),
    },
    enterDelay: { type: "number", advanced: true, defaultValueHint: 0 },
    exitDelay: { type: "number", advanced: true, defaultValueHint: 0 },
    enterTiming: {
      type: "string",
      advanced: true,
      defaultValueHint: "ease-out",
      ...({
        suggestions: ["linear", "ease", "ease-in", "ease-out", "ease-in-out"],
      } as any),
    },
    exitTiming: {
      type: "string",
      advanced: true,
      defaultValueHint: "ease-out",
      ...({
        suggestions: ["linear", "ease", "ease-in", "ease-out", "ease-in-out"],
      } as any),
    },
  };
};

export const popoverProps: CodeComponentMeta<DialogProps>["props"] = {
  open: {
    type: "boolean",
    editOnly: true,
    uncontrolledProp: "defaultOpen",
  },
  modal: {
    type: "boolean",
    advanced: true,
    description:
      "Disable interaction with outside elements. Only popover content will be visible to screen readers.",
  },
  onOpenChange: {
    type: "eventHandler",
    argTypes: [
      {
        type: "boolean",
        name: "open",
      },
    ],
  },
};
