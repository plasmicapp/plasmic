import { ensure } from "../common";
import { ScreenSizeSpec } from "./Css";

export interface FrameSize {
  name: string;
  width: number;
  height: number;
}

export interface FrameSizeGroup {
  groupName: string;
  sizes: FrameSize[];
}

export const enum ResponsiveStrategy {
  desktopFirst = "desktopFirst",
  mobileFirst = "mobileFirst",
  unknown = "unknown",
}

// Based on Figma's presets.
export const frameSizeGroups = [
  mkGroup("Phone")`
    iPhone 11 Pro Max 414 × 896
    iPhone 11 Pro / X 375 × 812
    iPhone 8 Plus 414 × 736
    iPhone 8 375 × 667
    iPhone SE 320 × 568
    Google Pixel 2 411 × 731
    Google Pixel 2 XL 411 × 823
    Android 360 × 640`,

  mkGroup("Tablet")`
    iPad mini 768 × 1024
    iPad Pro 11" 834 × 1194
    iPad Pro 12.9" 1024 × 1366
    Surface Pro 3 1440 × 990
    Surface Pro 4 1368 × 912`,

  mkGroup("Desktop")`
    Desktop 1440 × 1024
    MacBook 1152 × 700
    MacBook Pro 1440 × 900
    Surface Book 1500 × 1000
    iMac 1280 × 720`,

  mkGroup("TVs")`
    Standard 4K UDH 3840 × 2160
    Cinema 4096 × 2160`,
];

export const defaultResponsiveSettings =
  // Desktop first
  {
    screenSizes: [
      { width: 1366, height: 768 },
      { width: 414, height: 736 },
    ],
    breakpoints: [mkBreakpoint("Mobile", { maxWidth: 640 })],
  };

export const screenVariantPresetGroups = [
  {
    groupTitle: "Desktop first",
    presets: [
      {
        label: "Desktop, Mobile",
        breakpoints: [mkBreakpoint("Mobile", { maxWidth: 640 })],
      },
      {
        label: "Desktop, Tablet, Mobile",
        breakpoints: [
          mkBreakpoint("Tablet", { maxWidth: 1023 }),
          mkBreakpoint("Mobile", { maxWidth: 511 }),
        ],
      },
    ],
  },
  {
    groupTitle: "Mobile first",
    presets: [
      {
        label: "Mobile, Desktop",
        breakpoints: [mkBreakpoint("Desktop", { minWidth: 641 })],
      },
      {
        label: "Mobile, Tablet, Desktop",
        breakpoints: [
          mkBreakpoint("Tablet", { minWidth: 512 }),
          mkBreakpoint("Desktop", { minWidth: 1024 }),
        ],
      },
    ],
  },
];

function mkGroup(groupName: string) {
  return (specs: TemplateStringsArray): FrameSizeGroup => {
    function* gen() {
      for (const line of specs[0].trim().split("\n")) {
        const [, name, width, height] = ensure(
          /^ *(.*) (\d+) × (\d+)$/.exec(line)
        );
        yield { name, width: +width, height: +height };
      }
    }

    return { groupName, sizes: [...gen()] };
  };
}

function mkBreakpoint(name, props: { minWidth?: number; maxWidth?: number }) {
  return {
    name,
    screenSizeSpec: new ScreenSizeSpec(props.minWidth, props.maxWidth),
  };
}
