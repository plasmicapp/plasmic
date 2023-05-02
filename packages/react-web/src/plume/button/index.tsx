import * as React from "react";
import { omit, pick } from "../../common";
import { Overrides } from "../../render/elements";
import {
  AnyPlasmicClass,
  mergeVariantToggles,
  PlasmicClassArgs,
  PlasmicClassOverrides,
  PlasmicClassVariants,
  VariantDef,
} from "../plume-utils";

interface CommonProps {
  showStartIcon?: boolean;
  showEndIcon?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children?: React.ReactNode;
  isDisabled?: boolean;
}

interface HtmlButtonProps
  extends Omit<React.ComponentProps<"button">, "ref" | "disabled"> {
  submitsForm?: boolean;
}

interface HtmlAnchorProps
  extends Omit<React.ComponentProps<"a">, "ref" | "href" | "target"> {
  link?: string;
  target?: React.ComponentProps<"a">["target"] | boolean;
}

export type BaseButtonProps = CommonProps & HtmlButtonProps & HtmlAnchorProps;

export type HtmlAnchorOnlyProps = Exclude<
  keyof HtmlAnchorProps,
  keyof HtmlButtonProps
>;
export type HtmlButtonOnlyProps = Exclude<
  keyof HtmlButtonProps,
  keyof HtmlAnchorProps
>;

export type ButtonRef = React.Ref<HTMLButtonElement | HTMLAnchorElement>;

interface ButtonConfig<C extends AnyPlasmicClass> {
  showStartIconVariant: VariantDef<PlasmicClassVariants<C>>;
  showEndIconVariant?: VariantDef<PlasmicClassVariants<C>>;
  isDisabledVariant?: VariantDef<PlasmicClassVariants<C>>;
  startIconSlot?: keyof PlasmicClassArgs<C>;
  endIconSlot?: keyof PlasmicClassArgs<C>;
  contentSlot: keyof PlasmicClassArgs<C>;
  root: keyof PlasmicClassOverrides<C>;
}

export function useButton<P extends BaseButtonProps, C extends AnyPlasmicClass>(
  plasmicClass: C,
  props: P,
  config: ButtonConfig<C>,
  ref: ButtonRef = null
) {
  const {
    link,
    isDisabled,
    startIcon,
    endIcon,
    showStartIcon,
    showEndIcon,
    children,
    target,
    submitsForm = false,
    ...rest
  } = props;
  const variants = {
    ...pick(props, ...plasmicClass.internalVariantProps),
    ...mergeVariantToggles(
      { def: config.showStartIconVariant, active: showStartIcon },
      { def: config.showEndIconVariant, active: showEndIcon },
      { def: config.isDisabledVariant, active: isDisabled }
    ),
  };

  const args = {
    ...pick(props, ...plasmicClass.internalArgProps),
    ...(config.startIconSlot && { [config.startIconSlot]: startIcon }),
    ...(config.endIconSlot && { [config.endIconSlot]: endIcon }),
    [config.contentSlot]: children,
  };

  let buttonType = undefined;
  if (!link) {
    if (
      !plasmicClass.internalVariantProps.includes("type") &&
      !plasmicClass.internalArgProps.includes("type") &&
      "type" in rest
    ) {
      // There's no Plasmic-defined variant or arg called "type",
      // but the user passed in a "type" arg, so must be an override
      // or direct instantiation. We use that value
      buttonType = rest.type;
    } else {
      // Otherwise, we set buttonType depending in submitsForm
      buttonType = submitsForm ? "submit" : "button";
    }
  }

  const overrides: Overrides = {
    [config.root]: {
      as: link ? "a" : "button",
      props: {
        // Put this at the top, as user may also have set `type` as
        // inherited from "button", so let `rest` override it
        ...omit(
          rest as any,
          ...plasmicClass.internalArgProps,
          ...plasmicClass.internalVariantProps
        ),
        type: buttonType,
        ref: ref,
        disabled: isDisabled,
        target:
          target === true ? "_blank" : target === false ? undefined : target,
        ...(!!link && { href: link }),
      },
    },
  };

  return {
    plasmicProps: {
      variants: variants as PlasmicClassVariants<C>,
      args: args as PlasmicClassArgs<C>,
      overrides: overrides as PlasmicClassOverrides<C>,
    },
  };
}
