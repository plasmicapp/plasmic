import { useListBox } from "@react-aria/listbox";
import { HiddenSelect, useSelect as useAriaSelect } from "@react-aria/select";
import { useFocusableRef } from "@react-spectrum/utils";
import {
  SelectState as AriaSelectState,
  useSelectState as useAriaSelectState,
} from "@react-stately/select";
import { Placement } from "@react-types/overlays";
import { AriaSelectProps } from "@react-types/select";
import {
  AriaLabelingProps,
  DOMProps,
  FocusableDOMProps,
  FocusableProps,
  FocusableRef,
  FocusableRefValue,
  HoverEvents,
  InputBase,
} from "@react-types/shared";
import * as React from "react";
import { mergeProps, useHover, usePress } from "react-aria";
import { pick } from "../../common";
import { Overrides } from "../../render/elements";
import {
  deriveItemsFromChildren,
  renderAsCollectionChild,
  renderCollectionNode,
} from "../collection-utils";
import {
  AnyPlasmicClass,
  mergeVariantToggles,
  noOutline,
  PlasmicClassArgs,
  PlasmicClassOverrides,
  PlasmicClassVariants,
  VariantDef,
} from "../plume-utils";
import { getStyleProps, StyleProps } from "../props-utils";
import {
  TriggeredOverlayContext,
  TriggeredOverlayContextValue,
} from "../triggered-overlay/context";
import { SelectContext } from "./context";
import { BaseSelectOptionProps } from "./select-option";
import { BaseSelectOptionGroupProps } from "./select-option-group";

export interface BaseSelectProps
  extends DOMProps,
    AriaLabelingProps,
    FocusableDOMProps,
    InputBase,
    FocusableProps,
    HoverEvents,
    StyleProps {
  /**
   * Key of the currently selected value
   */
  value?: string | null;

  /**
   * Event handler fired when currently selected value changes
   */
  onChange?: (value: string | null) => void;

  /**
   * Uncontrolled key of the default selected value
   */
  defaultValue?: string;

  /**
   * List of Select.Options
   */
  children?: React.ReactNode;

  /**
   * Whether the Select is currently open
   */
  isOpen?: boolean;

  /**
   * Event handler fired when Select's open state changes
   */
  onOpenChange?: (isOpen: boolean) => void;

  /**
   * Uncontrolled default open state
   */
  defaultOpen?: boolean;

  /**
   * Form name of the select element
   */
  name?: string;

  /**
   * By default, Select will render whatever is in Select.Option as the
   * content in the trigger button when it is selected.  You can override
   * what content by passing in `selectedContent` here.
   */
  selectedContent?: React.ReactNode;

  /**
   * Desired placement location of the Select dropdown
   */
  placement?: Placement;

  /**
   * If true, menu width will always match the trigger button width.
   * If false, then menu width will have min-width matching the
   * trigger button width.
   */
  menuMatchTriggerWidth?: boolean;

  /**
   * If set, menu width will be exactly this width, overriding
   * menuMatchTriggerWidth.
   */
  menuWidth?: number;

  /**
   * Content to display when nothing is selected.
   */
  placeholder?: React.ReactNode;
}

const COLLECTION_OPTS = {
  itemPlumeType: "select-option",
  sectionPlumeType: "select-option-group",
};

type AriaOptionType = React.ReactElement<BaseSelectOptionProps>;
type AriaGroupType = React.ReactElement<BaseSelectOptionGroupProps>;
type AriaSelectItemType = AriaOptionType | AriaGroupType;

/**
 * Converts props in our BaseSelectProps into props that react-aria's
 * useSelect() understands.
 *
 * Because we're not exposing the Collections API (see ./index.tsx),
 * we are converting our own API into props for useSelect.
 *
 * Specifically, in Plume's API,
 * - `children` flattens to a list of ReactElements of type Select.Option
 *   or Select.OptionGroup
 *
 * and we map it this way to the Collections API:
 * - `items` is a list of those flattened ReactElements from `children`!
 * - `children`, as a render prop, is supposed to take one of the `items`
 *   and return a `Section` or `Item` element. We take an Option/OptionGroup
 *   element, and use its props to render the appropriate `Section` or
 *   `Item`. The "trick" here is that we then stuff the Option element as
 *   `Item.children`, and the OptionGroup element as `Section.title`.
 *
 * When the Collections API does its work deriving `Node`s, the corresponding
 * Option/OptionGroup ReactElements will end up as `Node.rendered`.
 *
 * Then, when we are actually rendering the content of the dropdown, we
 * iterate through each collected `Node`, and renders
 * React.cloneElement(Node.rendered, {_node: node}).  This "secretly" passes
 * the derived collection `Node` as a prop to Option and OptionGroup, and they
 * can make use of the derived `Node.key` etc in their rendering functions.
 *
 * One thing to note here is that we never "rendered" the Option/OptionGroup
 * React elements that the user constructed; instead, we just looked at the
 * props used on those elements, and passed those onto the Collections API.
 * What gets rendered to the screen is the cloned version of these elements
 * with the secret derived `_node` prop.  That means Option and OptionGroup
 * render functions can assume that _node is passed in.
 */
function asAriaSelectProps(props: BaseSelectProps) {
  let {
    value,
    defaultValue,
    children,
    onChange,
    placement,
    menuMatchTriggerWidth,
    menuWidth,
    ...rest
  } = props;
  const { items, disabledKeys } = deriveItemsFromChildren(children, {
    ...COLLECTION_OPTS,
    invalidChildError: `Can only use Select.Option and Select.OptionGroup as children to Select`,
    requireItemValue: true,
  });

  return {
    ariaProps: {
      ...rest,
      children: (child) => renderAsCollectionChild(child, COLLECTION_OPTS),
      onSelectionChange: onChange
        ? (val) => {
            onChange!((val ?? null) as string | null);
          }
        : onChange,
      items,
      disabledKeys,
      defaultSelectedKey: defaultValue,

      // react-aria is picky about selectedKey; if it is null, it means "no selection";
      // if it is undefined, it means "uncontrolled".  So here, if the user passes in a
      // value prop, then we make sure selectedKey will be null and not undefined, so
      // we don't accidentally enter uncontrolled mode.
      ...("value" in props && { selectedKey: value ?? null }),
    } as AriaSelectProps<AriaSelectItemType>,
  };
}

export type SelectRef = FocusableRef;
export type SelectRefValue = FocusableRefValue;

interface SelectConfig<C extends AnyPlasmicClass> {
  placeholderVariant?: VariantDef<PlasmicClassVariants<C>>;
  isOpenVariant: VariantDef<PlasmicClassVariants<C>>;
  isDisabledVariant?: VariantDef<PlasmicClassVariants<C>>;

  triggerContentSlot: keyof PlasmicClassArgs<C>;
  optionsSlot: keyof PlasmicClassArgs<C>;
  placeholderSlot: keyof PlasmicClassArgs<C>;

  root: keyof PlasmicClassOverrides<C>;
  trigger: keyof PlasmicClassOverrides<C>;
  overlay: keyof PlasmicClassOverrides<C>;
  optionsContainer: keyof PlasmicClassOverrides<C>;
}

interface SelectState {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
  getSelectedValue: () => string | null;
  setSelectedValue: (value: string | null) => void;
}

export function useSelect<P extends BaseSelectProps, C extends AnyPlasmicClass>(
  plasmicClass: C,
  props: P,
  config: SelectConfig<C>,
  ref: SelectRef = null
) {
  const { ariaProps } = asAriaSelectProps(props);
  const { placement } = props;
  const state = useAriaSelectState<AriaSelectItemType>(ariaProps);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const rootRef = useFocusableRef(ref, triggerRef);

  const {
    isDisabled,
    name,
    menuWidth,
    menuMatchTriggerWidth,
    autoFocus,
    placeholder,
    selectedContent,
  } = props;

  const { triggerProps: triggerPressProps, menuProps } = useAriaSelect(
    ariaProps,
    state,
    triggerRef
  );

  const { pressProps: triggerProps } = usePress(triggerPressProps);
  const { hoverProps: triggerHoverProps } = useHover(ariaProps);

  const triggerContent = state.selectedItem
    ? selectedContent ?? state.selectedItem.value.props.children
    : null;

  const variants = {
    ...pick(props, ...plasmicClass.internalVariantProps),
    ...mergeVariantToggles(
      { def: config.isOpenVariant, active: state.isOpen },
      { def: config.placeholderVariant, active: !state.selectedItem },
      { def: config.isDisabledVariant, active: isDisabled }
    ),
  };

  const triggerContext: TriggeredOverlayContextValue = React.useMemo(
    () => ({
      triggerRef,
      state,
      placement,
      overlayMatchTriggerWidth: menuMatchTriggerWidth,
      overlayMinTriggerWidth: true,
      overlayWidth: menuWidth,
    }),
    [triggerRef, state, placement, menuMatchTriggerWidth, menuWidth]
  );

  const overrides: Overrides = {
    [config.root]: {
      props: mergeProps(getStyleProps(props), {
        ref: rootRef,
      }),
      wrapChildren: (children) => (
        <>
          <HiddenSelect
            state={state}
            triggerRef={triggerRef}
            name={name}
            isDisabled={isDisabled}
          />
          {children}
        </>
      ),
    },
    [config.trigger]: {
      props: mergeProps(triggerProps, triggerHoverProps, {
        ref: triggerRef,
        autoFocus,
        disabled: !!isDisabled,
        // Don't trigger form submission!
        type: "button",
      }),
    },
    [config.overlay]: {
      wrap: (content) => (
        <TriggeredOverlayContext.Provider value={triggerContext}>
          {content}
        </TriggeredOverlayContext.Provider>
      ),
    },
    [config.optionsContainer]: {
      wrap: (content) => (
        <ListBoxWrapper state={state} menuProps={menuProps}>
          {content as React.ReactElement}
        </ListBoxWrapper>
      ),
    },
  };

  const args = {
    ...pick(props, ...plasmicClass.internalArgProps),
    [config.triggerContentSlot]: triggerContent,
    [config.placeholderSlot]: placeholder,
    [config.optionsSlot]: (
      <SelectContext.Provider value={state}>
        {Array.from(state.collection).map((node) => renderCollectionNode(node))}
      </SelectContext.Provider>
    ),
  };

  const plumeState: SelectState = {
    open: () => state.open(),
    close: () => state.close(),
    isOpen: () => state.isOpen,
    getSelectedValue: () => (state.selectedKey ? `${state.selectedKey}` : null),
    setSelectedValue: (key) => state.setSelectedKey(key as any),
  };

  return {
    plasmicProps: {
      variants: variants as PlasmicClassVariants<C>,
      args: args as PlasmicClassArgs<C>,
      overrides: overrides as PlasmicClassOverrides<C>,
    },
    state: plumeState,
  };
}

function ListBoxWrapper(props: {
  state: AriaSelectState<any>;
  menuProps: React.HTMLAttributes<HTMLElement>;
  children: React.ReactElement;
}) {
  const { state, menuProps, children } = props;

  const ref = React.useRef<HTMLElement>(null);

  const { listBoxProps } = useListBox(
    {
      ...menuProps,
      isVirtualized: false,
      autoFocus: state.focusStrategy || true,
      disallowEmptySelection: true,
    },
    state,
    ref
  );

  return React.cloneElement(
    children,
    mergeProps(children.props, listBoxProps, { style: noOutline(), ref })
  );
}
