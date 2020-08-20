import { Overrides, Renderer } from '@plasmicapp/react-web';
import { FocusScope } from '@react-aria/focus';
import { useListBox } from '@react-aria/listbox';
import {
  DismissButton,
  useOverlay,
  useOverlayPosition,
} from '@react-aria/overlays';
import { HiddenSelect, useSelect } from '@react-aria/select';
import { unwrapDOMRef, useFocusableRef } from '@react-spectrum/utils';
import { SelectState, useSelectState } from '@react-stately/select';
import { Placement } from '@react-types/overlays';
import { AriaSelectProps } from '@react-types/select';
import {
  AsyncLoadable,
  FocusableRef,
  FocusableRefValue,
  FocusStrategy,
  HoverEvents,
} from '@react-types/shared';
import pick from 'lodash-es/pick';
import * as React from 'react';
import {
  mergeProps,
  mergeVariantDefTuples,
  PlasmicClass,
  RendererArgs,
  RendererOverrides,
  RendererVariants,
  StyleProps,
  useForwardedRef,
  VariantDefTuple,
} from '../common';
import commonStyles from '../common.module.css';
import { SelectContext } from './context';

export type PlumeSelectProps<T> = Omit<
  AriaSelectProps<T>,
  keyof AsyncLoadable
> &
  StyleProps &
  HoverEvents & {
    name?: string;
    placement?: Placement;
    placeholder?: React.ReactNode;
    renderSelectedItem?: (
      item: T | undefined,
      rendered: React.ReactNode
    ) => React.ReactNode;
    menuWidth?: number;
    autoFocus?: boolean;
  };

export type PlumeSelectRef = FocusableRef;
export type PlumeSelectRefValue = FocusableRefValue;

interface PlumeSelectConfig<R extends Renderer<any, any, any, any>> {
  isOpenVariant: VariantDefTuple<RendererVariants<R>>;
  placeholderVariant?: VariantDefTuple<RendererVariants<R>>;
  isDisabledVariant?: VariantDefTuple<RendererVariants<R>>;
  hasLabelVariant?: VariantDefTuple<RendererVariants<R>>;

  triggerContentSlot: keyof RendererArgs<R>;
  optionsSlot: keyof RendererArgs<R>;

  root: keyof RendererOverrides<R>;
  trigger: keyof RendererOverrides<R>;
  overlayContainer: keyof RendererOverrides<R>;
  optionsContainer: keyof RendererOverrides<R>;
  label?: keyof RendererOverrides<R>;

  renderOption: (key: React.Key, content: React.ReactNode) => React.ReactNode;
}

export function usePlumeSelect<
  T extends object,
  P extends PlumeSelectProps<T>,
  R extends Renderer<any, any, any, any>
>(
  plasmicClass: PlasmicClass<R>,
  props: P,
  config: PlumeSelectConfig<R>,
  ref: PlumeSelectRef = null
) {
  const {
    isDisabled,
    shouldFlip = false,
    label,
    name,
    placeholder,
    className,
    style,
    menuWidth,
    renderSelectedItem,
  } = props;
  const renderer = plasmicClass.createRenderer();

  const state = useSelectState(props);
  const triggerRef = React.useRef<FocusableRefValue>(null);
  const rootRef = useFocusableRef(ref, unwrapDOMRef(triggerRef));
  const listboxRef = React.useRef<HTMLDivElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);

  const { triggerProps, menuProps, labelProps } = useSelect(
    props,
    state,
    unwrapDOMRef(triggerRef)
  );
  const { overlayProps: overlayAriaProps } = useOverlay(
    {
      isOpen: state.isOpen,
      onClose: () => state.close(),
      isDismissable: true,
      shouldCloseOnBlur: true,
    },
    overlayRef
  );
  const {
    overlayProps: overlayPositionProps,
    updatePosition,
  } = useOverlayPosition({
    targetRef: unwrapDOMRef(triggerRef),
    overlayRef: overlayRef,
    scrollRef: listboxRef,
    placement: props.placement,
    shouldFlip: shouldFlip,
    isOpen: state.isOpen,
    containerPadding: 0,
  });

  React.useLayoutEffect(() => {
    if (state.isOpen) {
      requestAnimationFrame(() => {
        updatePosition();
      });
    }
  }, [state.isOpen, updatePosition]);

  const items = Array.from(state.collection).map((item) => {
    return (
      <React.Fragment key={item.key}>
        {config.renderOption(item.key, item.rendered)}
      </React.Fragment>
    );
  });

  // Measure the width of the button to inform the width of the menu (below).
  const [buttonWidth, setButtonWidth] = React.useState<number | null>(null);
  React.useLayoutEffect(() => {
    const unwrappedTriggerRef = unwrapDOMRef(triggerRef);
    if (unwrappedTriggerRef.current) {
      const width = unwrappedTriggerRef.current.offsetWidth;
      setButtonWidth(width);
    }
  }, [triggerRef, state.selectedKey]);

  const overlayProps = mergeProps(
    {
      style: {
        left: 'auto',
        right: 'auto',
        top: 'auto',
        bottom: 'auto',
        position: 'absolute',
      },
    },
    overlayAriaProps,
    overlayPositionProps,
    {
      style: {
        width: menuWidth ?? buttonWidth,
        minWidth: buttonWidth,
      },
      ref: overlayRef,
    }
  );
  const triggerContent = state.selectedItem
    ? renderSelectedItem
      ? renderSelectedItem(
          state.selectedItem.value,
          state.selectedItem.rendered
        )
      : state.selectedItem.rendered
    : placeholder;

  const variants = {
    ...pick(props, ...renderer.getInternalVariantProps()),
    ...mergeVariantDefTuples([
      state.isOpen && config.isOpenVariant,
      !state.selectedItem && config.placeholderVariant,
      isDisabled && config.isDisabledVariant,
      props.label && config.hasLabelVariant,
    ]),
  };

  const overrides: Overrides = {
    [config.root]: {
      props: {
        className,
        style,
        ref: rootRef,
      },
      wrapChildren: (children) => (
        <>
          <HiddenSelect
            state={state}
            triggerRef={unwrapDOMRef(triggerRef)}
            label={label}
            name={name}
          />
          {children}
        </>
      ),
    },
    [config.trigger]: {
      props: mergeProps(
        triggerProps,
        pick(props, 'onHoverStart', 'onHoverEnd', 'onHoverChange'),
        { ref: triggerRef }
      ),
    },
    [config.overlayContainer]: {
      props: overlayProps,
    },
    [config.optionsContainer]: {
      props: {},
      wrap: (children) => (
        <ListBoxWrapper
          state={state}
          menuProps={menuProps}
          autoFocus={state.focusStrategy || true}
          ref={listboxRef}
        >
          {children}
        </ListBoxWrapper>
      ),
    },
    ...(config.label
      ? {
          [config.label]: {
            as: 'label',
            props: labelProps,
          },
        }
      : {}),
  };

  const args = {
    ...pick(props, ...renderer.getInternalArgProps()),
    [config.triggerContentSlot]: triggerContent,
    [config.optionsSlot]: (
      <SelectContext.Provider value={state}>{items}</SelectContext.Provider>
    ),
  };

  return {
    plumeProps: {
      variants: variants as RendererVariants<R>,
      args: args as RendererArgs<R>,
      overrides: overrides as RendererOverrides<R>,
    },
    state,
  };
}

const ListBoxWrapper = React.forwardRef(function ListBoxWrapper<T>(
  props: {
    state: SelectState<T>;
    menuProps: React.HTMLAttributes<HTMLElement>;
    autoFocus?: boolean | FocusStrategy;
    children?: React.ReactNode;
  },
  outerRef: React.Ref<HTMLDivElement>
) {
  const { state, menuProps, children } = props;

  const { ref, onRef } = useForwardedRef(outerRef);

  const { listBoxProps } = useListBox(
    // @ts-ignore
    {
      ...props,
      ...menuProps,
      isVirtualized: false,
    },
    state,
    ref
  );

  return (
    <FocusScope restoreFocus>
      <DismissButton onDismiss={() => state.close()} />
      <div
        {...mergeProps(listBoxProps, { className: commonStyles.noOutline })}
        ref={onRef}
      >
        {children}
      </div>
    </FocusScope>
  );
});
