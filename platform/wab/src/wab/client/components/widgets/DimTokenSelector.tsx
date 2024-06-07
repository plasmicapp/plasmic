import { isKnownStyleToken, StyleToken } from "@/wab/classes";
import { FieldAriaProps } from "@/wab/client/components/aria-utils";
import ListItem from "@/wab/client/components/ListItem";
import ListSectionHeader from "@/wab/client/components/ListSectionHeader";
import ListSectionSeparator from "@/wab/client/components/ListSectionSeparator";
import { GeneralTokenEditModal } from "@/wab/client/components/sidebar/GeneralTokenEditModal";
import { ValueSetState } from "@/wab/client/components/sidebar/sidebar-helpers";
import { Matcher } from "@/wab/client/components/view-common";
import Chip from "@/wab/client/components/widgets/Chip";
import { useClientTokenResolver } from "@/wab/client/components/widgets/ColorPicker/client-token-resolver";
import DropdownOverlay from "@/wab/client/components/widgets/DropdownOverlay";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { useOnContainerScroll } from "@/wab/client/dom-utils";
import PencilIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Pencil";
import { PlusCircleIcon } from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__PlusCircle";
import PlasmicDimTokenSelector, {
  PlasmicDimTokenSelector__VariantsArgs,
} from "@/wab/client/plasmic/plasmic_kit_style_controls/PlasmicDimTokenSelector";
import { useUndo } from "@/wab/client/shortcuts/studio/useUndo";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  assert,
  ensure,
  filterFalsy,
  precisionRound,
  spawn,
  unexpected,
} from "@/wab/common";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import {
  derefToken,
  mkTokenRef,
  TokenType,
  tokenTypeDefaults,
  tokenTypeLabel,
  tryParseTokenRef,
} from "@/wab/commons/StyleToken";
import * as css from "@/wab/css";
import { lengthCssUnits, parseCssNumericNew, toShorthandVals } from "@/wab/css";
import {
  siteToAllDirectTokensOfType,
  TokenValueResolver,
} from "@/wab/shared/cached-selectors";
import { createNumericSize, isValidUnit, showSizeCss } from "@/wab/shared/Css";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { notification, Tooltip } from "antd";
import type { TooltipPlacement } from "antd/es/tooltip";
import cn from "classnames";
import { useCombobox, UseComboboxGetItemPropsOptions } from "downshift";
import L from "lodash";
import { observer } from "mobx-react";
import React from "react";
import {
  AriaPositionProps,
  useInteractOutside,
  useOverlayPosition,
} from "react-aria";
import ReactDOM from "react-dom";
import { VariableSizeList } from "react-window";

export interface DimTokenSpinnerRef {
  focus: () => void;
}

function MiddleEllipsis({
  children,
  matcher,
  tailLength,
}: {
  children: string;
  matcher: Matcher;
  tailLength: number;
}) {
  const [head, tail] = React.useMemo(
    () =>
      children
        .match(
          new RegExp(
            `^(.+?)(.{${Math.min(
              Math.floor(children.length / 2),
              tailLength
            )}})$`
          )
        )
        ?.slice(1) ?? [],
    [children, tailLength]
  );
  return (
    <div style={{ display: "flex", width: "100%" }}>
      {matcher.boldSnippets(
        <>
          <span
            style={{
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
            }}
          >
            {head}
          </span>
          <span style={{ whiteSpace: "nowrap" }}>{tail}</span>
        </>
      )}
    </div>
  );
}

export const DimTokenSpinner = observer(
  React.forwardRef(function DimTokenSpinner(
    props: {
      className?: string;
      "data-test-id"?: string;
      tokenType?: TokenType;
      fieldAriaProps?: FieldAriaProps;
      studioCtx?: StudioCtx;
      dropdownPlacement?: AriaPositionProps["placement"];
      minDropdownWidth?: number;
      maxDropdownWidth?: number;
      autoFocus?: boolean;
      showDropdownOnFocus?: boolean;
      hideArrow?: boolean;
      disabled?: boolean;
      styleType?: PlasmicDimTokenSelector__VariantsArgs["styleType"];
      valueSetState?: ValueSetState;
      onEscape?: (e: React.KeyboardEvent) => void;
      placeholder?: string;
      disabledTooltip?: React.ReactNode | (() => React.ReactNode);
      tooltip?: React.ReactNode | (() => React.ReactNode);
      tooltipPlacement?: TooltipPlacement;
      "data-plasmic-prop"?: string;
      onFocus?: () => void;
      onBlur?: () => void;
    } & DimValueOpts,
    ref: React.Ref<DimTokenSpinnerRef>
  ) {
    const {
      value,
      tokenType,
      noClear,
      allowedUnits = css.lengthCssUnits,
      extraOptions: _extraOptions = [],
      onChange,
      fieldAriaProps,
      studioCtx,
      dropdownPlacement = "bottom right",
      minDropdownWidth = 0,
      maxDropdownWidth = 1000,
      shorthand,
      autoFocus,
      showDropdownOnFocus,
      hideArrow,
      disabled,
      styleType,
      disabledTooltip,
      valueSetState,
      placeholder,
      onEscape,
      vsh,
    } = props;

    const extraOptions = _extraOptions.map((it) =>
      typeof it === "string" ? { value: it } : it
    );

    if (tokenType && !studioCtx) {
      throw new Error("Must pass in studioCtx if using with tokens");
    }
    const tokens =
      tokenType &&
      siteToAllDirectTokensOfType(
        ensure(studioCtx, "DimTokenSelector expects studioCtx if using tokens")
          .site,
        tokenType
      );

    const { displayValue, tryOnChange, spin, values } = useDimValue(props);
    const shorthandVals = shorthand ? toShorthandVals(values) : values;
    const parsedValues = tokens
      ? shorthandVals.map((v) => tryParseTokenRef(v, tokens) || v)
      : shorthandVals;
    const parsedTokens = parsedValues.filter((v): v is StyleToken =>
      isKnownStyleToken(v)
    );
    const editableTokens = parsedTokens.filter(
      (v) => studioCtx?.site.styleTokens.includes(v) && !v.isRegistered
    );

    const hasParsedToken = parsedTokens.length > 0;

    const rootRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const overlayRef = React.useRef<HTMLDivElement>(null);
    const listRef = React.useRef<VariableSizeList>(null);
    const menuRef = React.useRef<HTMLElement>(null);

    const {
      value: typedInputValue,
      push: setTypedInputValue,
      handleKeyDown,
      reset,
    } = useUndo<string | undefined>(undefined);
    const [focused, setFocused] = React.useState(false);
    const inputValue =
      typedInputValue ?? (hasParsedToken ? "" : focused ? value : displayValue);

    const [editToken, setEditToken] = React.useState<StyleToken | undefined>(
      undefined
    );

    const [newToken, setNewToken] = React.useState<StyleToken | undefined>(
      undefined
    );

    const isNumberMode = !isNaN(parseFloat(inputValue));
    const matcher = new Matcher(isNumberMode ? "" : typedInputValue ?? "");
    const showCurrentToken = hasParsedToken && typedInputValue === undefined;
    const skipChangeOnBlur = React.useRef(false);
    const [explicitHighlightedIndex, setExplicitHighlightedIndex] =
      React.useState<number | undefined>(undefined);

    React.useImperativeHandle(ref, () => ({
      focus() {
        inputRef.current?.focus();
      },
    }));

    const makeUnitOptions = (): ConvertUnitItem[] => {
      if (typedInputValue && typedInputValue.length > 0) {
        return [];
      }
      const parsed = values.map((val) => parseCssNumericNew(val))[0];
      if (!parsed || parsed.num === undefined) {
        return [];
      }
      return [
        ...allowedUnits.filter(
          (unit) =>
            unit != parsed.units &&
            (css.typicalCssLengthUnits.has(unit) || unit === "")
        ),
      ].map(
        (unit) =>
          ({
            type: "convert",
            value: `${parsed.num}${unit}`,
          } as const)
      );
    };

    const makeExtraOptions = (): SetValueItem[] => {
      let options = extraOptions
        .filter((op) => !op.hide)
        .map((op) => ({ type: "value", value: op } as const));

      if (!isNumberMode) {
        // If we're typing in words, then also filter this down by words
        options = options.filter((op) =>
          matcher.matches(
            typeof op.value.label === "string"
              ? op.value.label
              : op.value.cleanLabel || op.value.value
          )
        );
      }
      return options.map((it) => ({
        ...it,
        ...(it.value as any),
      }));
    };

    const makeTokenOptions = (): (
      | AddTokenItem
      | EditTokenItem
      | SelectTokenItem
    )[] => {
      if (!tokenType || !tokens) {
        return [];
      }

      return filterFalsy([
        // Always show create token option
        { type: "add-token" } as const,
        // Only show edit token option if a token is currently selected, and the user
        // hasn't typed anything yet
        inputValue.length === 0 &&
          editableTokens.length > 0 &&
          ({ type: "edit-token", token: editableTokens[0] } as const),

        // In number mode, always show all tokens; else only show tokens that match
        ...tokens
          .filter((t) => isNumberMode || matcher.matches(t.name))
          .map((token) => ({ type: "token", token } as const)),
      ]);
    };

    const rawItems: RealItem[] = filterFalsy([
      // Always show clear option
      !noClear && ({ type: "clear" } as const),
      ...makeExtraOptions(),
      ...makeUnitOptions(),
      ...makeTokenOptions(),
    ]);

    const hasOptions =
      rawItems.length > 0 || !!tokenType || !noClear || extraOptions.length > 0;

    let itemIndex = 0;
    const virtualItems: VirtualItem[] = rawItems.map((item) => ({
      type: "action",
      item,
      itemIndex: itemIndex++,
    }));

    const addTokenIndex = virtualItems.findIndex(
      (x) => x.type === "action" && x.item.type === "add-token"
    );

    if (addTokenIndex >= 0) {
      virtualItems.splice(
        addTokenIndex,
        0,
        ...filterFalsy([
          addTokenIndex > 0 && ({ type: "separator" } as const),
          { type: "header" } as const,
        ])
      );
    }

    const getDefaultHighlightedIndex = () => {
      if (!isNumberMode && typedInputValue && typedInputValue.length > 0) {
        const index = rawItems.findIndex(
          (item) => item.type === "value" || item.type === "token"
        );

        if (index >= 0) {
          return index;
        }
      }
      return -1;
    };

    const handleBlur = () => {
      if (!skipChangeOnBlur.current && typedInputValue !== undefined) {
        tryOnChange(typedInputValue, "raw");
      }
      resetState();
      if (isOpen) {
        closeMenu();
      }
      setFocused(false);
    };

    // When DimTokenSelector is in a <FocusScope/>, we can't rely on blur events
    // to close the menu, because <FocusScope/> will force this input to be focused
    // if you try to blur it (something _must_ be focused in FocusScope). Thus, we
    // detect clicks outside and close the menu ourselves.
    useInteractOutside({
      ref: rootRef,
      onInteractOutside: (e) => {
        if (
          overlayRef.current &&
          overlayRef.current.contains(e.target as HTMLElement)
        ) {
          return;
        }
        handleBlur();
      },
    });

    const highlightedIndex =
      explicitHighlightedIndex ?? getDefaultHighlightedIndex();

    const {
      getInputProps,
      getItemProps,
      getComboboxProps,
      getMenuProps,
      getToggleButtonProps,
      isOpen,
      openMenu,
      closeMenu,
    } = useCombobox({
      inputValue,
      items: rawItems,
      highlightedIndex,
      labelId: fieldAriaProps?.["aria-labelledby"],
      inputId: fieldAriaProps?.id,
      onHighlightedIndexChange: (change) => {
        if (
          change.highlightedIndex !== undefined &&
          change.highlightedIndex >= 0
        ) {
          setExplicitHighlightedIndex(change.highlightedIndex);
        } else {
          setExplicitHighlightedIndex(undefined);
        }
      },
      onStateChange: (changes) => {
        if (disabled) {
          return;
        }
        if (
          changes.highlightedIndex != null &&
          listRef.current &&
          changes.type !== useCombobox.stateChangeTypes.MenuMouseLeave
        ) {
          // Make sure the highlighted item is revealed by the virtual list.  We need
          // to map from "items" index to "virtualItems" index here.
          const highlightedItem = rawItems[changes.highlightedIndex];
          const virtualIndex = virtualItems.findIndex(
            (item) => item.type === "action" && item.item === highlightedItem
          );

          if (virtualIndex >= 0) {
            listRef.current.scrollToItem(virtualIndex, "smart");
          }
        }
        if (changes.type === useCombobox.stateChangeTypes.InputBlur) {
          handleBlur();
        }
        if (
          changes.type === useCombobox.stateChangeTypes.InputKeyDownEnter ||
          changes.type === useCombobox.stateChangeTypes.ItemClick
        ) {
          const selectedItem = changes.selectedItem;
          if (selectedItem) {
            if (
              selectedItem.type === "value" ||
              selectedItem.type === "convert"
            ) {
              tryOnChange(selectedItem.value, "selected");
            } else if (selectedItem.type === "clear") {
              tryOnChange(undefined, "selected");
            } else if (selectedItem.type === "token") {
              onChange(mkTokenRef(selectedItem.token), "selected");
            } else if (selectedItem.type === "add-token") {
              spawn(
                ensure(
                  studioCtx,
                  "DimTokenSelector expects to have studioCtx if adding token"
                ).changeUnsafe(() => {
                  const startValue = parseCssNumericNew(inputValue)
                    ? css.autoUnit(inputValue, [...allowedUnits][0], value)
                    : tokenTypeDefaults(
                        ensure(
                          tokenType,
                          "tokenType must not be nullwhen adding token"
                        )
                      );
                  const _newToken = ensure(
                    studioCtx,
                    "DimTokenSelector expects to have studioCtx if adding token"
                  )
                    .tplMgr()
                    .addToken({
                      tokenType: ensure(
                        tokenType,
                        "tokenType must not be null when adding token"
                      ),
                      value: startValue,
                    });

                  onChange(mkTokenRef(_newToken), "selected");
                  setNewToken(_newToken);
                })
              );
            } else if (selectedItem.type === "edit-token") {
              setEditToken(selectedItem.token);
            }
          }
          skipChangeOnBlur.current = true;
          resetState();
        }
        if (changes.type === useCombobox.stateChangeTypes.InputKeyDownEscape) {
          skipChangeOnBlur.current = true;
          resetState();
        }
      },
    });

    const { overlayProps: overlayPositionProps } = useOverlayPosition({
      targetRef: rootRef,
      overlayRef,
      placement: dropdownPlacement,
      offset: 5,
      isOpen: isOpen,
    });

    const resolver = useClientTokenResolver();

    useOnContainerScroll({
      ref: rootRef,
      onScroll: () => {
        closeMenu();
      },
      disabled: !isOpen,
    });

    const itemSizer = (index: number) => {
      const item = virtualItems[index];
      if (!item) {
        return 0;
      } else if (item.type === "header") {
        return 44;
      } else if (item.type === "separator") {
        return 1;
      } else {
        return 32;
      }
    };

    const height = Math.min(
      200,
      L.sum(L.range(virtualItems.length).map(itemSizer))
    );

    const resetState = () => {
      reset();
      setExplicitHighlightedIndex(undefined);
    };

    const menuWidth = rootRef.current
      ? Math.min(
          maxDropdownWidth,
          Math.max(rootRef.current.offsetWidth, minDropdownWidth)
        )
      : 300;

    return (
      <>
        <MaybeWrap
          cond={!!props.tooltip}
          wrapper={(x) => (
            <Tooltip title={props.tooltip} placement={props.tooltipPlacement}>
              {x as React.ReactElement}
            </Tooltip>
          )}
        >
          <PlasmicDimTokenSelector
            valueSetState={
              valueSetState === "isUnset" && typedInputValue
                ? "isSet"
                : valueSetState
            }
            showDropdownArrow={hasOptions && !hideArrow}
            showCurrentTokens={showCurrentToken}
            styleType={styleType}
            textbox={{
              ...getInputProps({
                onFocus: (e) => {
                  props.onFocus?.();
                  if (!isOpen && showDropdownOnFocus) {
                    openMenu();
                  }
                  e.target.select();
                  skipChangeOnBlur.current = false;
                  setFocused(true);
                },
                onBlur: () => {
                  props.onBlur?.();
                },
                onKeyDown: (e) => {
                  if (
                    typedInputValue === undefined &&
                    (e.key === "Backspace" || e.key === "Delete")
                  ) {
                    setTypedInputValue("");
                  }
                  openMenu();

                  if (handleKeyDown(e)) {
                    return;
                  }

                  if (e.key === "Escape") {
                    if (isOpen) {
                      skipChangeOnBlur.current = true;
                      e.stopPropagation();
                      resetState();
                      closeMenu();
                      onEscape && onEscape(e);
                    }
                  } else if (isNumberMode) {
                    (e.nativeEvent as any).preventDownshiftDefault = true;
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      spin("up", e.shiftKey);
                      resetState();
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      spin("down", e.shiftKey);
                      resetState();
                    } else if (e.key === "Enter") {
                      skipChangeOnBlur.current = true;
                      tryOnChange(inputValue, "raw");
                      resetState();
                      closeMenu();
                    }
                  } else if (e.key === "Enter") {
                    skipChangeOnBlur.current = true;
                    if (
                      extraOptions.some((option) => option.value === inputValue)
                    ) {
                      tryOnChange(inputValue, "raw");
                      resetState();
                      closeMenu();
                    }
                  }
                },
                onChange: (e) => {
                  setTypedInputValue(e.currentTarget.value);
                  if (listRef.current) {
                    // Item sizes are cached on the virtual list, so if list members change,
                    // we need to invalidate the cache
                    listRef.current.resetAfterIndex(0, true);
                  }
                },
                ref: inputRef,
                autoFocus,
                disabled,
                placeholder,
              }),

              style: showCurrentToken ? { width: 0, padding: 0 } : undefined,
              "data-test-id": props["data-test-id"] as any,
              "data-plasmic-prop": props["data-plasmic-prop"],
            }}
            existingTokens={parsedValues.map((val) =>
              isKnownStyleToken(val) ? (
                <Chip
                  key={val.uuid}
                  tooltip={`${val.name} (${derefToken(
                    ensure(tokens, "tokens is expected to be not null"),
                    val,
                    vsh
                  )})`}
                >
                  {val.name}
                </Chip>
              ) : (
                <div key={val} className="text-ellipsis">
                  {val}
                </div>
              )
            )}
            root={{
              props: {
                ...getComboboxProps({
                  ref: rootRef as any,
                  className: cn("overflow-hidden", props.className),
                  ...(disabled
                    ? {}
                    : {
                        onClick: () => {
                          if (inputRef.current) {
                            inputRef.current.focus();
                          }
                          if (!isOpen) {
                            openMenu();
                          }
                        },
                      }),
                }),
              },

              wrap: (elt) => {
                if (disabled && disabledTooltip) {
                  return <Tooltip title={disabledTooltip}>{elt}</Tooltip>;
                } else {
                  return elt;
                }
              },
            }}
            dropdownToggle={{
              ref: triggerRef,
              disabled: disabled,
              ...getToggleButtonProps(),
            }}
            disabled={disabled}
          />
        </MaybeWrap>

        {ReactDOM.createPortal(
          <DropdownOverlay
            ref={overlayRef}
            {...overlayPositionProps}
            style={{
              position: "absolute",
              display: isOpen && hasOptions ? "block" : "none",
              ...overlayPositionProps.style,
            }}
          >
            <ul
              {...getMenuProps({
                ref: menuRef,
                "aria-label": fieldAriaProps?.["aria-label"],
              })}
            >
              {isOpen && (
                <DimTokenContext.Provider
                  value={{
                    matcher,
                    getItemProps,
                    highlightedItemIndex: highlightedIndex,
                    tokenType,
                    vsh,
                    resolver,
                  }}
                >
                  <VariableSizeList
                    ref={listRef}
                    itemData={virtualItems}
                    itemCount={virtualItems.length}
                    estimatedItemSize={32}
                    height={height}
                    width={menuWidth}
                    overscanCount={2}
                    itemSize={itemSizer}
                  >
                    {Row}
                  </VariableSizeList>
                </DimTokenContext.Provider>
              )}
            </ul>
          </DropdownOverlay>,
          document.body
        )}

        {editToken && (
          <GeneralTokenEditModal
            studioCtx={ensure(
              studioCtx,
              "studioCtx is expected to be not null if editing token"
            )}
            token={editToken}
            onClose={() => {
              setEditToken(undefined);
              closeMenu();
            }}
            vsh={vsh}
          />
        )}

        {newToken && (
          <GeneralTokenEditModal
            studioCtx={ensure(
              studioCtx,
              "studioCtx is expected to be not null if adding token"
            )}
            token={newToken}
            defaultEditingName={true}
            onClose={() => {
              setNewToken(undefined);
              closeMenu();
            }}
            vsh={vsh}
          />
        )}
      </>
    );
  })
);

interface SelectTokenItem {
  type: "token";
  token: StyleToken;
}

interface AddTokenItem {
  type: "add-token";
}

interface EditTokenItem {
  type: "edit-token";
  token: StyleToken;
}

interface SetValueItem {
  type: "value";
  value: string;
}

interface ClearValueItem {
  type: "clear";
}

interface ConvertUnitItem {
  type: "convert";
  value: string;
}

type RealItem =
  | SelectTokenItem
  | AddTokenItem
  | EditTokenItem
  | SetValueItem
  | ClearValueItem
  | ConvertUnitItem;

interface TokenHeaderItem {
  type: "header";
}

interface SeparatorItem {
  type: "separator";
}

interface ActionItem {
  type: "action";
  item: RealItem;
  itemIndex: number;
}

type VirtualItem = TokenHeaderItem | SeparatorItem | ActionItem;

interface DimTokenContextValue {
  allTokens?: StyleToken[];
  matcher: Matcher;
  getItemProps: (options: UseComboboxGetItemPropsOptions<any>) => any;
  highlightedItemIndex: number;
  tokenType?: TokenType;
  vsh?: VariantedStylesHelper;
  resolver: TokenValueResolver;
}

const DimTokenContext = React.createContext<DimTokenContextValue | undefined>(
  undefined
);

const Row = React.memo(function Row(props: {
  data: VirtualItem[];
  index: number;
  style: React.CSSProperties;
}) {
  const { data, index, style } = props;
  const item = data[index];
  const context = ensure(
    React.useContext(DimTokenContext),
    "DimTokenContext is expected to be not nullish"
  );
  const {
    matcher,
    getItemProps,
    highlightedItemIndex,
    tokenType,
    vsh,
    resolver,
  } = context;

  if (item.type === "header") {
    return (
      <ListSectionHeader style={style}>
        {tokenTypeLabel(
          ensure(tokenType, "tokenType is expected to be not null")
        )}{" "}
        Tokens
      </ListSectionHeader>
    );
  } else if (item.type === "separator") {
    return <ListSectionSeparator style={style} />;
  } else {
    const action = item.item;
    const isFocused = highlightedItemIndex === item.itemIndex;
    const itemProps = {
      ...getItemProps({ item, index: item.itemIndex }),
      role: "option",
      style: style,
    };

    if (action.type === "token") {
      const realValue = resolver(action.token, vsh);
      return (
        <Tooltip title={action.token.name} placement="left" visible={isFocused}>
          <li {...itemProps} aria-label={action.token.name}>
            <ListItem
              isFocused={isFocused}
              showAddendums
              addendum={<code>{realValue}</code>}
              hideIcon
            >
              <MiddleEllipsis tailLength={8} matcher={matcher}>
                {action.token.name}
              </MiddleEllipsis>
            </ListItem>
          </li>
        </Tooltip>
      );
    } else if (action.type === "value") {
      return (
        <li {...itemProps} aria-label={action.value}>
          <ListItem isFocused={isFocused} hideIcon>
            {(action as any).label || matcher.boldSnippets(action.value)}
          </ListItem>
        </li>
      );
    } else if (action.type === "clear") {
      return (
        <li {...itemProps} aria-label={"Unset"}>
          <ListItem isFocused={isFocused} hideIcon>
            <em>(Unset)</em>
          </ListItem>
        </li>
      );
    } else if (action.type === "convert") {
      return (
        <li {...itemProps} aria-label={action.value}>
          <ListItem
            isFocused={isFocused}
            // showAddendums
            // addendum={<code>{action.value}</code>}
            hideIcon
          >
            <span>
              Convert to <strong>{action.value}</strong>
            </span>
          </ListItem>
        </li>
      );
    } else if (action.type === "add-token") {
      return (
        <li {...itemProps} aria-label={"Add new token"}>
          <ListItem isFocused={isFocused} icon={<Icon icon={PlusCircleIcon} />}>
            Create new token...
          </ListItem>
        </li>
      );
    } else if (action.type === "edit-token") {
      return (
        <li {...itemProps} aria-label={`Edit token "${action.token.name}"`}>
          <ListItem isFocused={isFocused} icon={<Icon icon={PencilIcon} />}>
            Edit "{action.token.name}"
          </ListItem>
        </li>
      );
    }
    throw unexpected();
  }
});

type ChangeType = "raw" | "spin" | "selected";

export interface DimValueOpts {
  value: string;
  onChange: (value: string | undefined, type: ChangeType) => void;
  extraOptions?: (
    | {
        value: string;
        label?: React.ReactNode;
        cleanLabel?: string;
        hide?: boolean;
      }
    | string
  )[];
  shorthand?: boolean;
  noClear?: boolean;
  allowedUnits?: readonly string[];
  min?: number;
  max?: number;
  delta?: number;
  fractionDigits?: number;
  displayedFractionDigits?: number;
  vsh?: VariantedStylesHelper;
}

function useDimValue(opts: DimValueOpts) {
  const {
    value,
    onChange,
    extraOptions: _extraOptions = [],
    shorthand,
    noClear,
    allowedUnits = [...lengthCssUnits],
    min = Number.NEGATIVE_INFINITY,
    max = Infinity,
    delta = 1,
    fractionDigits = 3,
    displayedFractionDigits = 3,
  } = opts;

  const allowedUnitsSet = new Set(allowedUnits);
  const preferredUnit =
    ["", ...css.typicalCssLengthUnits].find((u) => allowedUnitsSet.has(u)) ??
    allowedUnits[0];

  const extraOptions = _extraOptions.map((it) =>
    typeof it === "string" ? { value: it } : it
  );

  const values = shorthand ? css.parseCssShorthand(value) : [value];

  function checkValidValue(val: string) {
    if (extraOptions.some((it) => it.value === val)) {
      return true;
    }

    const newValues = shorthand ? css.parseCssShorthand(val) : [val];
    for (const newValue of newValues) {
      if (extraOptions.some((it) => it.value === newValue)) {
        continue;
      }
      const parsed = parseCssNumericNew(newValue);

      if (!parsed) {
        notification.error({
          message: `Invalid value "${newValue}"`,
          description: `Must be a numeric value`,
        });

        return false;
      }

      const hasValidUnit =
        allowedUnits.includes(parsed.units) ||
        (allowedUnits.length === 0 && parsed.units.length === 0);
      if (!hasValidUnit) {
        showUnitError(newValue);
        return false;
      }

      if (parsed.num > max) {
        notification.error({
          message: `Invalid value "${newValue}"`,
          description: `Must be less than ${max}.`,
        });

        return false;
      }

      if (parsed.num < min) {
        notification.error({
          message: `Invalid value "${newValue}"`,
          description: `Must be greater than ${min}.`,
        });

        return false;
      }
    }
    return true;
  }

  function roundValue(val: string) {
    const parsed = parseCssNumericNew(val);
    if (parsed) {
      parsed.num = precisionRound(parsed.num, Math.min(fractionDigits, 4));
      return css.showCssNumericNew(parsed);
    } else {
      return val;
    }
  }

  function showUnitError(newValue: string) {
    notification.error({
      message: `Invalid value "${newValue}"`,
      description: `Must use one of these units - ${allowedUnits.join(", ")}.`,
    });
  }

  function tryChange(newValue: string | undefined, type: ChangeType) {
    if (newValue === undefined) {
      assert(!noClear, "noClear must be false to clear value");
      onChange(undefined, type);
      return true;
    }
    newValue = newValue.trim();
    if (!checkValidValue(newValue)) {
      return false;
    }
    if (shorthand) {
      newValue = css.showCssShorthand(
        css.parseCssShorthand(newValue).map((val) => roundValue(val))
      );
    } else {
      newValue = roundValue(newValue);
    }
    onChange(newValue, type);
    return true;
  }

  function tryOnChange(val: string | undefined, type: ChangeType) {
    if (val === undefined) {
      return tryChange(val, type);
    }
    if (extraOptions.some((it) => it.value === val)) {
      return tryChange(val, type);
    }
    if (shorthand) {
      const newVals = css.parseCssShorthand(val);
      const autoVals = newVals.map((v, i) =>
        css.autoUnit(v, preferredUnit, values[i])
      );

      return tryChange(css.showCssShorthand(autoVals), type);
    } else {
      const autoVal = css.autoUnit(val, preferredUnit, value);
      return tryChange(autoVal, type);
    }
  }

  const displayValue = css.roundedCssNumeric(value, displayedFractionDigits);

  function spin(dir: "up" | "down", large?: boolean) {
    if (!value || isNaN(parseFloat(value))) {
      return;
    }
    const curParsed = parseCssNumericNew(value);
    const { num, units } = curParsed || {
      num: 0,
      units: preferredUnit,
    };

    const effectiveDelta =
      (large ? 10 * delta : delta) * (dir === "up" ? 1 : -1);
    const effectiveUnits = units || preferredUnit;

    if (!isValidUnit(effectiveUnits)) {
      showUnitError(value);
    } else {
      tryChange(
        showSizeCss(
          createNumericSize(
            Math.max(min, Math.min(+(num + effectiveDelta), max)),
            effectiveUnits
          )
        ),

        "spin"
      );
    }
  }

  return {
    displayValue,
    tryOnChange,
    spin,
    values,
  };
}

export default DimTokenSpinner;
