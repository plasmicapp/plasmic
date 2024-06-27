import { ensure } from "@/wab/shared/common";
import { ScreenSizeSpec } from "@/wab/shared/css-size";

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
    iPhone 14 & 15 Pro Max 430 × 932
    iPhone 14 & 15 Pro 393 × 852
    iPhone 13 & 14 390 × 844
    iPhone 14 Plus 428 × 926
    iPhone SE 320 × 568
    iPhone 8 Plus 414 × 736
    iPhone 8 375 × 667
    Google Pixel 8 412 × 732
    Android Small 360 × 640
    Android Large 360 × 800`,

  mkGroup("Tablet")`
    Surface Pro 8 1440 × 960
    iPad mini 8.3 744 × 1133
    iPad Pro 11" 834 × 1194
    iPad Pro 12.9" 1024 × 1366`,

  mkGroup("Desktop")`
    Desktop 1440 × 1024
    MacBook Air 1280 × 832
    MacBook Pro 1512 × 982
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
