import { usePlasmicLink } from "@plasmicapp/host";
import React from "react";
import { mergeProps, useFocusRing, useHover, useLink } from "react-aria";
import type { ButtonProps, LinkProps } from "react-aria-components";
import { Button } from "react-aria-components";
import {
  COMMON_STYLES,
  createAriaLabelProp,
  createAutoFocusProp,
  createDisabledProp,
  createIdProp,
} from "./common";
import {
  CodeComponentMetaOverrides,
  Registerable,
  makeComponentName,
  registerComponentHelper,
} from "./utils";
import {
  VariantUpdater,
  WithVariants,
  pickAriaComponentVariants,
} from "./variant-utils";

const BUTTON_VARIANTS = [
  "hovered" as const,
  "pressed" as const,
  "focused" as const,
  "focusVisible" as const,
  "disabled" as const,
];

const { variants } = pickAriaComponentVariants(BUTTON_VARIANTS);

type ButtonCommonProps = { children: React.ReactNode } & Omit<
  ButtonProps,
  "className" | "children"
> &
  Omit<LinkProps, "className" | "children">;
type LinkSpecificProps = Pick<LinkProps, "href" | "target">;
type ButtonSpecificProps = {
  resetsForm?: boolean;
  submitsForm?: boolean;
};

export interface BaseButtonProps
  extends ButtonCommonProps,
    LinkSpecificProps,
    ButtonSpecificProps,
    WithVariants<typeof BUTTON_VARIANTS> {
  children: React.ReactNode;
  className?: string;
}

export const BaseButton = React.forwardRef(function BaseButtonInner(
  props: BaseButtonProps,
  ref: React.Ref<HTMLButtonElement | HTMLAnchorElement>
) {
  const { href, isDisabled: disabled } = props;

  if (href && !disabled) {
    return (
      <LinkButton
        props={props}
        ref={ref as React.RefObject<HTMLAnchorElement>}
      />
    );
  } else {
    const { submitsForm, resetsForm, children, plasmicUpdateVariant, ...rest } =
      props;
    const type = submitsForm ? "submit" : resetsForm ? "reset" : "button";

    const buttonProps = mergeProps(rest, {
      type,
      style: COMMON_STYLES,
      ref: ref as React.Ref<HTMLButtonElement>,
    });

    return (
      <Button {...buttonProps}>
        {({ isHovered, isPressed, isFocused, isFocusVisible, isDisabled }) => (
          <>
            <VariantUpdater
              changes={{
                hovered: isHovered,
                pressed: isPressed,
                focused: isFocused,
                focusVisible: isFocusVisible,
                disabled: isDisabled,
              }}
              updateVariant={plasmicUpdateVariant}
            />
            {children}
          </>
        )}
      </Button>
    );
  }
});

function LinkButton({
  props,
  ref,
}: {
  props: BaseButtonProps;
  ref: React.RefObject<HTMLAnchorElement>;
}) {
  const { href, children, plasmicUpdateVariant, ...rest } = props;
  const PlasmicLink = usePlasmicLink();
  const { linkProps, isPressed } = useLink(props, ref);
  const { hoverProps, isHovered } = useHover(props);
  const { focusProps, isFocused, isFocusVisible } = useFocusRing();

  const combinedLinkProps = mergeProps(linkProps, hoverProps, focusProps, {
    href,
    className: props.className,
    style: COMMON_STYLES,
    id: props.id,
    "aria-label": props["aria-label"],
    ref,
  });

  return (
    <PlasmicLink
      {...combinedLinkProps}
      data-focused={isFocused || undefined}
      data-hovered={isHovered || undefined}
      data-pressed={isPressed || undefined}
      data-focus-visible={isFocusVisible || undefined}
      data-disabled={props.isDisabled || undefined}
    >
      <VariantUpdater
        changes={{
          hovered: isHovered,
          pressed: isPressed,
          focused: isFocused,
          focusVisible: isFocusVisible,
          disabled: !!rest.isDisabled,
        }}
        updateVariant={plasmicUpdateVariant}
      />
      {children}
    </PlasmicLink>
  );
}

export const BUTTON_COMPONENT_NAME = makeComponentName("button");

export function registerButton(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseButton>
) {
  registerComponentHelper(
    loader,
    BaseButton,
    {
      name: BUTTON_COMPONENT_NAME,
      displayName: "Aria Button",
      importPath: "@plasmicpkgs/react-aria/skinny/registerButton",
      importName: "BaseButton",
      variants,
      defaultStyles: {
        // Ensure consistent design across rendered elements (button, anchor tag).
        backgroundColor: "#EFEFEF",
        borderColor: "black",
        borderStyle: "solid",
        borderWidth: "1px",
        color: "#000000",
        cursor: "pointer",
        fontFamily: "Arial",
        fontSize: "1rem",
        lineHeight: "1.2",
        padding: "2px 10px",
        textDecorationLine: "none",
      },
      props: {
        id: createIdProp("Button"),
        autoFocus: createAutoFocusProp("Button"),
        isDisabled: createDisabledProp("Button"),
        "aria-label": createAriaLabelProp("Button"),
        children: {
          type: "slot",
          mergeWithParent: true,
          defaultValue: {
            type: "text",
            value: "Button",
          },
        },
        href: {
          type: "href",
          description:
            "The URL this button navigates to. If present, this button is an <a> element.",
        },
        target: {
          type: "choice",
          options: ["_blank", "_self", "_parent", "_top"],
          description:
            "Same as target attribute of <a> element. Only applies when the href prop is present.",
          hidden: (props) => !props.href,
          defaultValueHint: "_self",
        },
        submitsForm: {
          type: "boolean",
          displayName: "Submits form?",
          defaultValueHint: false,
          hidden: (props) => Boolean(props.resetsForm) || Boolean(props.href),
          description:
            "Whether clicking this button should submit the enclosing form.",
          advanced: true,
        },
        resetsForm: {
          type: "boolean",
          displayName: "Resets form?",
          defaultValueHint: false,
          hidden: (props) => Boolean(props.submitsForm) || Boolean(props.href),
          description:
            "Whether clicking this button should reset the enclosing form.",
          advanced: true,
        },
        onPress: {
          type: "eventHandler",
          argTypes: [{ name: "event", type: "object" }],
        },
        onFocus: {
          type: "eventHandler",
          argTypes: [{ name: "event", type: "object" }],
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
