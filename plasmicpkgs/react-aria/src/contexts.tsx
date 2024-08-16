import React from "react";
import type { StrictItemType } from "./option-utils";
import { BaseCheckboxGroup } from "./registerCheckboxGroup";
import { BaseDialogTrigger } from "./registerDialogTrigger";
import type { BaseHeader } from "./registerHeader";
import type { BaseInput } from "./registerInput";
import type { BaseLabel } from "./registerLabel";
import type { BaseListBoxProps } from "./registerListBox";
import { BaseRadioGroup } from "./registerRadioGroup";
import type { BaseSection } from "./registerSection";
import { BaseSlider } from "./registerSlider";
import { BaseTextField } from "./registerTextField";

// We pass down context props via our own Plasmic*Context instead of directly
// using react-aria-component's *Context, because react-aria-component's
// contexts don't "merge" with contexts further up the tree, so if we render
// a context provider, it will just be overwritten by react-aria-component's
// context provider.  So we do the merging within our own Base* components
// instead.

// Creating the text field context here because input/textarea inside text field receive a null for the TextFieldContext
export const PlasmicTextFieldContext = React.createContext<
  React.ComponentProps<typeof BaseTextField> | undefined
>(undefined);

export const PlasmicCheckboxGroupContext = React.createContext<
  React.ComponentProps<typeof BaseCheckboxGroup> | undefined
>(undefined);

export const PlasmicRadioGroupContext = React.createContext<
  React.ComponentProps<typeof BaseRadioGroup> | undefined
>(undefined);

export const PlasmicDialogTriggerContext = React.createContext<
  React.ComponentProps<typeof BaseDialogTrigger> | undefined
>(undefined);

export type PlasmicSliderContextType<T extends number | number[]> =
  | React.ComponentProps<typeof BaseSlider<T>>
  | undefined;

export const PlasmicSliderContext =
  React.createContext<PlasmicSliderContextType<number | number[]>>(undefined);

export const PlasmicLabelContext = React.createContext<
  React.ComponentProps<typeof BaseLabel> | undefined
>(undefined);

export const PlasmicListBoxContext = React.createContext<
  BaseListBoxProps | undefined
>(undefined);

export const PlasmicItemContext = React.createContext<
  StrictItemType | undefined
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
