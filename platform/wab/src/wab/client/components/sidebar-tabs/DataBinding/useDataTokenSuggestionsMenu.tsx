import ListItem from "@/wab/client/components/ListItem";
import { displayTokenValue } from "@/wab/client/components/sidebar-tabs/DataBinding/data-token-suggestions";
import { useSuggestDataTokens } from "@/wab/client/components/sidebar-tabs/DataBinding/useSuggestDataTokens";
import { Matcher } from "@/wab/client/components/view-common";
import DropdownOverlay from "@/wab/client/components/widgets/DropdownOverlay";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { useElementWidth } from "@/wab/client/hooks/useElementWidth";
import { DataTokenIcon } from "@/wab/client/icons";
import { DataTokenRef, DataTokenType } from "@/wab/commons/DataToken";
import { UseComboboxGetInputPropsOptions, useCombobox } from "downshift";
import React from "react";
import { useOverlayPosition } from "react-aria";
import ReactDOM from "react-dom";

export interface UseDataTokenSuggestionsMenuProps {
  category: DataTokenType;

  queryText: string;

  /**
   * Delay before opening on focus. Slate needs its selection to settle first,
   * or it clears the caret on the render that opening causes.
   */
  openDelayMs?: number;
  /** Runs when the user picks a token, before it's bound to the param. */
  onSelect?: () => void;
}

export function useDataTokenSuggestionsMenu(
  props: UseDataTokenSuggestionsMenuProps
) {
  const { category, queryText, openDelayMs, onSelect } = props;
  const { suggestDataTokens, onSelectDataToken } =
    useSuggestDataTokens(category);

  // Only for highlighting matches in the list; the ranking builds its own.
  const matcher = React.useMemo(() => new Matcher(queryText), [queryText]);
  const items = suggestDataTokens?.(queryText) ?? [];

  const openTimer = React.useRef<ReturnType<typeof setTimeout>>();
  const cancelPendingOpen = () => clearTimeout(openTimer.current);
  React.useEffect(() => cancelPendingOpen, []);

  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const anchorRef = React.useRef<HTMLElement | null>(null);
  anchorRef.current = anchor;

  const {
    isOpen,
    highlightedIndex,
    openMenu,
    closeMenu,
    getComboboxProps,
    getInputProps,
    getMenuProps,
    getItemProps,
  } = useCombobox<DataTokenRef>({
    items,
    inputValue: queryText,
    // For screen-reader announcement
    itemToString: (item) => item?.token.name ?? "",
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) {
        onSelect?.();
        onSelectDataToken?.(selectedItem);
      }
    },
  });
  const isMenuOpen = isOpen && items.length > 0;

  const { overlayProps } = useOverlayPosition({
    targetRef: anchorRef,
    overlayRef,
    placement: "bottom end",
    shouldFlip: false,
    offset: 4,
    isOpen: isMenuOpen,
  });
  const anchorWidth = useElementWidth(anchor, { enabled: isMenuOpen });

  const menu = ReactDOM.createPortal(
    <DropdownOverlay
      ref={overlayRef}
      {...overlayProps}
      className="absolute block"
      style={{
        width: anchorWidth,
        minWidth: 240,
        ...overlayProps.style,
        // This is to avoid downshift dev-logs every render
        ...(isMenuOpen ? undefined : { display: "none" }),
      }}
    >
      <ul
        {...getMenuProps({
          "data-test-id": "data-token-suggestions",
          className: "m0 p0",
          style: { maxHeight: 200, overflowY: "auto" },
          // Clicking in the list must not blur the input
          onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
        } as any)}
      >
        {isMenuOpen &&
          items.map((tokenRef, index) => {
            const token = tokenRef.token;
            const value = displayTokenValue(token.value);
            return (
              <li
                key={token.uuid}
                {...getItemProps({
                  item: tokenRef,
                  index,
                  "aria-label": token.name,
                  title: value ? `${token.name}\n${value}` : token.name,
                } as any)}
              >
                <ListItem
                  isFocused={index === highlightedIndex}
                  icon={<Icon icon={DataTokenIcon} className="dimfg" />}
                  addendum={value && matcher.boldSnippets(value)}
                  showAddendums={!!value}
                  style={{ paddingLeft: 8, paddingRight: 8 }}
                >
                  {matcher.boldSnippets(token.name)}
                </ListItem>
              </li>
            );
          })}
      </ul>
    </DropdownOverlay>,
    document.body
  );

  return {
    openMenu,
    getComboboxProps: (
      options?: Omit<Parameters<typeof getComboboxProps>[0], "ref">
    ) => getComboboxProps({ ...options, ref: setAnchor }),
    getInputProps: (options: UseComboboxGetInputPropsOptions = {}) => {
      const { onKeyDown, onBlur, onFocus, onContextMenu, ...rest } = options;
      const {
        onKeyDown: downshiftKeyDown,
        onBlur: downshiftBlur,
        // Each editor owns its own text and change handling.
        onChange: _downshiftChange,
        value: _downshiftValue,
        // Points at a label element downshift never renders here.
        "aria-labelledby": _downshiftLabelledBy,
        ref: _downshiftRef,
        ...inputProps
      } = getInputProps(rest, { suppressRefError: true });

      return {
        ...inputProps,
        onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
          onFocus?.(e);
          if (!suggestDataTokens || queryText !== "") {
            return;
          }
          cancelPendingOpen();
          if (openDelayMs) {
            openTimer.current = setTimeout(openMenu, openDelayMs);
          } else {
            openMenu();
          }
        },
        onContextMenu: (e: React.MouseEvent<HTMLInputElement>) => {
          onContextMenu?.(e);
          cancelPendingOpen();
          closeMenu();
        },
        onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
          if (isMenuOpen) {
            downshiftKeyDown?.(e);
            if (e.defaultPrevented) {
              // antd steps the value on Arrow↑/↓ from a handler on its wrapper
              e.stopPropagation();
              return;
            }
          }
          onKeyDown?.(e);
        },
        onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
          cancelPendingOpen();
          // Ours first: downshift's blur commits the highlighted token on Tab,
          // and submitting after that would overwrite it.
          onBlur?.(e);
          downshiftBlur?.(e);
        },
      };
    },
    menu,
  };
}
