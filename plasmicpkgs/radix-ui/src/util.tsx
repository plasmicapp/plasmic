import { CodeComponentMeta } from "@plasmicapp/host";
import { DialogProps } from "@radix-ui/react-dialog";
import * as React from "react";
import { ReactElement, ReactNode, useState } from "react";
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
export type EnterAnim = (typeof enterAnims)[number];
export const exitAnims = [
  "fade-out",
  "zoom-exit",
  "slide-out-to-top",
  "slide-out-to-right",
  "slide-out-to-bottom",
  "slide-out-to-left",
] as const;
export type ExitAnim = (typeof exitAnims)[number];
export type AnimName = EnterAnim | ExitAnim;

// https://github.com/reactwg/react-18/discussions/111#discussioncomment-1517837
let id = 0;
export const useId = (React as any).useId ?? (() => useState(() => "" + id++));

/** Allow attaching pseudoclasses and other CSS selectors to this unique component instance */
export const StyleWrapper = ({
  children,
  cssStr,
}: {
  children: (dynClass: string | undefined) => ReactElement;
  cssStr: string;
}) => {
  const dynClass = "pd__" + useId().replace(/:/g, "");
  return (
    <>
      {children(dynClass)}
      <style>{dynClass ? cssStr.replace(/&/g, `.${dynClass}`) : ""}</style>
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
  enterTiming = "ease",
  exitTiming = "ease",
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
      cssStr={`
        &&[data-state=closed] {
          animation-duration: ${exitDuration}s;
          animation-timing-function: ${exitTiming};
          animation-delay: ${exitDelay};
          ${exitAnimations
            .map((exitAnimation) => animations[exitAnimation] ?? "")
            .join(" ")}
        }
        &&,
        &&[data-state=open] {
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
    ps.enterAnimations ?? defaultEnterAnimations?.(ps);
  const getExitAnimations = (ps: any) =>
    ps.exitAnimations ?? defaultExitAnimations?.(ps);
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
      advanced: true,
      defaultValueHint: "100%",
      hidden: (ps) =>
        !getExitAnimations(ps)?.includes("slide-out-to-right") &&
        !getExitAnimations(ps)?.includes("slide-out-to-left"),
    },
    enterTranslateY: {
      type: "string",
      advanced: true,
      defaultValueHint: "100%",
      hidden: (ps) =>
        !getEnterAnimations(ps)?.includes("slide-in-from-bottom") &&
        !getEnterAnimations(ps)?.includes("slide-in-from-top"),
    },
    exitTranslateY: {
      type: "string",
      advanced: true,
      defaultValueHint: "100%",
      hidden: (ps) =>
        !getExitAnimations(ps)?.includes("slide-out-to-bottom") &&
        !getExitAnimations(ps)?.includes("slide-out-to-top"),
    },
    enterOpacity: {
      type: "number",
      advanced: true,
      defaultValueHint: 0,
      hidden: (ps) => !getEnterAnimations(ps)?.includes("fade-in"),
    },
    exitOpacity: {
      type: "number",
      advanced: true,
      defaultValueHint: 0,
      hidden: (ps) => !getExitAnimations(ps)?.includes("fade-out"),
    },
    enterScale: {
      type: "number",
      advanced: true,
      defaultValueHint: 0.95,
      hidden: (ps) => !getEnterAnimations(ps)?.includes("zoom-enter"),
    },
    exitScale: {
      type: "number",
      advanced: true,
      defaultValueHint: 0.95,
      hidden: (ps) => !getExitAnimations(ps)?.includes("zoom-exit"),
    },
    enterDelay: { type: "number", advanced: true, defaultValueHint: 0 },
    exitDelay: { type: "number", advanced: true, defaultValueHint: 0 },
    enterTiming: {
      type: "string",
      advanced: true,
      defaultValueHint: "ease",
      ...({
        suggestions: ["linear", "ease", "ease-in", "ease-out", "ease-in-out"],
      } as any),
    },
    exitTiming: {
      type: "string",
      advanced: true,
      defaultValueHint: "ease",
      ...({
        suggestions: ["linear", "ease", "ease-in", "ease-out", "ease-in-out"],
      } as any),
    },
  };
};

export const overlayStates = {
  open: {
    type: "writable",
    valueProp: "open",
    onChangeProp: "onOpenChange",
    variableType: "boolean",
  },
} as const;

export const overlayProps = ({
  defaultSlotContent,
  triggerSlotName,
  openDisplay,
}: {
  defaultSlotContent: any;
  triggerSlotName: string;
  openDisplay?: string;
  // Need to work around the typescript v3 or v4 used in root public-packages via tsdx
}): CodeComponentMeta<DialogProps>["props"] => ({
  open: {
    type: "boolean",
    displayName: openDisplay,
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
  [triggerSlotName]: {
    type: "slot",
    defaultValue: [defaultSlotContent],
    ...({
      mergeWithParent: true,
    } as any),
  },
  themeResetClass: { type: "themeResetClass" },
});

export function prefixClasses(x: string) {
  return x
    .trim()
    .split(/\s+/g)
    .map((part) => `pl__${part}`)
    .join(" ");
}

// Be careful formatting this!
// Note that these are magically prepended with pl__
const prefixedBaseStyles = `
.box-border {
  box-sizing: border-box;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
.absolute {
    position: absolute;
}
.relative {
    position: relative;
}
.transition {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, -webkit-backdrop-filter;
}
.h-full {
    height: 100%;
}
.z-50 { z-index: 50;  }
.fixed { position: fixed; }
.inset-0 { top: 0; left: 0; right: 0; bottom: 0; }
.bottom-0 {
    bottom: 0px;
}
.left-0 {
    left: 0px;
}
.right-0 {
    right: 0px;
}
.top-0 {
    top: 0px;
}
.right-4 {
    right: 1rem;
}
.top-4 {
    top: 1rem;
}
.h-4 { height: 1rem; }
.w-4 { width: 1rem; }
.outline-none { outline: none; }

@keyframes plsmc-enter {

    from {
        opacity: var(--tw-enter-opacity, 1);
        transform: translate3d(var(--tw-enter-translate-x, 0), var(--tw-enter-translate-y, 0), 0) scale3d(var(--tw-enter-scale, 1), var(--tw-enter-scale, 1), var(--tw-enter-scale, 1)) rotate(var(--tw-enter-rotate, 0));
    }
}

@keyframes plsmc-exit {

    to {
        opacity: var(--tw-exit-opacity, 1);
        transform: translate3d(var(--tw-exit-translate-x, 0), var(--tw-exit-translate-y, 0), 0) scale3d(var(--tw-exit-scale, 1), var(--tw-exit-scale, 1), var(--tw-exit-scale, 1)) rotate(var(--tw-exit-rotate, 0));
    }
}
.animate-in,
.data-\\[state\\=open\\]\\:animate-in[data-state=open] {
  animation-name: plsmc-enter;
  animation-duration: 150ms;
  --tw-enter-opacity: initial;
  --tw-enter-scale: initial;
  --tw-enter-rotate: initial;
  --tw-enter-translate-x: initial;
  --tw-enter-translate-y: initial;
}
.animate-out,
.data-\\[state\\=closed\\]\\:animate-out[data-state=closed] {
  animation-name: plsmc-exit;
  animation-duration: 150ms;
  --tw-exit-opacity: initial;
  --tw-exit-scale: initial;
  --tw-exit-rotate: initial;
  --tw-exit-translate-x: initial;
  --tw-exit-translate-y: initial;
}
.data-\\[side\\=bottom\\]\\:slide-in-from-top-2[data-side=bottom] {
    --tw-enter-translate-y: -0.5rem;
}

.data-\\[side\\=left\\]\\:slide-in-from-right-2[data-side=left] {
    --tw-enter-translate-x: 0.5rem;
}

.data-\\[side\\=right\\]\\:slide-in-from-left-2[data-side=right] {
    --tw-enter-translate-x: -0.5rem;
}

.data-\\[side\\=top\\]\\:slide-in-from-bottom-2[data-side=top] {
    --tw-enter-translate-y: 0.5rem;
}

`.replace(/\n\./g, ".pl__");

export function BaseStyles() {
  // return <style>{prefixedBaseStyles}</style>;
  return <style dangerouslySetInnerHTML={{ __html: prefixedBaseStyles }} />;
}

export const popoverProps = {
  side: {
    type: "choice",
    options: ["top", "bottom", "left", "right"] as string[],
    defaultValueHint: "bottom",
  },
  sideOffset: {
    type: "number",
    defaultValueHint: 0,
    advanced: true,
  },
  align: {
    type: "choice",
    options: ["center", "start", "end"] as string[],
    defaultValueHint: "center",
  },
  alignOffset: {
    type: "number",
    defaultValueHint: 0,
    advanced: true,
  },
  ...animPropTypes({
    defaultEnterAnimations: () => ["fade-in", "zoom-enter"],
    defaultExitAnimations: () => ["fade-out", "zoom-exit"],
  }),
  slideIn: {
    type: "boolean",
    defaultValueHint: true,
    description:
      "Add additional subtle slide-in animation on reveal, which can depend on where the tooltip is dynamically placed.",
  },
} as const;
export type PopoverExtraProps = AnimatedProps & {
  themeResetClass?: string;
  overlay?: ReactNode;
  slideIn?: boolean;
};

export function wrapFragmentInDiv(
  node: React.ReactNode,
  className?: string
): React.ReactNode {
  if (React.isValidElement(node) && node.type === React.Fragment) {
    const props: { [key: string]: string | undefined | null } = {
      ...omit(node.props, ["children"]),
      key: node.key,
    };
    props["className"] = props["className"]
      ? props["className"] + className
      : className;
    return <div {...props}>{node.props.children}</div>;
  }
  return node;
}
