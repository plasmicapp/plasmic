import React from "react";
import type { BaseHeader } from "./registerHeader";
import type { BaseInput } from "./registerInput";
import type { BaseLabel } from "./registerLabel";
import type { BaseListBoxProps } from "./registerListBox";
import type { BaseListBoxItem } from "./registerListBoxItem";
import type { BasePopover } from "./registerPopover";
import type { BaseSection } from "./registerSection";
import { BaseSlider } from "./registerSlider";

// We pass down context props via our own Plasmic*Context instead of directly
// using react-aria-component's *Context, because react-aria-component's
// contexts don't "merge" with contexts further up the tree, so if we render
// a context provider, it will just be overwritten by react-aria-component's
// context provider.  So we do the merging within our own Base* components
// instead.

export const PlasmicSliderContext = React.createContext<
  React.ComponentProps<typeof BaseSlider> | undefined
>(undefined);

export const PlasmicLabelContext = React.createContext<
  React.ComponentProps<typeof BaseLabel> | undefined
>(undefined);

export const PlasmicListBoxContext = React.createContext<
  BaseListBoxProps | undefined
>(undefined);

export const PlasmicPopoverContext = React.createContext<
  React.ComponentProps<typeof BasePopover> | undefined
>(undefined);

export const PlasmicItemContext = React.createContext<
  React.ComponentProps<typeof BaseListBoxItem> | undefined
>(undefined);

export const PlasmicSectionContext = React.createContext<
  React.ComponentProps<typeof BaseSection> | undefined
>(undefined);

export const PlasmicHeaderContext = React.createContext<
  React.ComponentProps<typeof BaseHeader> | undefined
>(undefined);

export const PlasmicInputContext = React.createContext<
  React.ComponentProps<typeof BaseInput> | undefined
>(undefined);
