import { combineProps } from "@/wab/commons/components/ReactUtil";
import { useCombobox, UseComboboxGetInputPropsOptions } from "downshift";
import { debounce } from "lodash";
import React from "react";
import { FixedSizeList, VariableSizeList } from "react-window";

interface VirtualItem<I> {
  item?: I;
  itemIndex?: number;
}

function buildItemIndexToVirtualIndexMap<I, V extends VirtualItem<I>>(
  virtualItems: V[],
  items: I[]
) {
  const map: Record<number, number> = {};
  virtualItems.forEach((vi, index) => {
    if (vi.itemIndex != null) {
      map[vi.itemIndex] = index;
    }
  });
  return map;
}

export function useVirtualCombobox<I, V extends VirtualItem<I>>(opts: {
  listRef: React.RefObject<FixedSizeList | VariableSizeList>;
  /**
   * virtualRows is the same as virtualItems, but chunked up into what we want to show in the same row, e.g. if you want
   * to show multiple items in the same row. Helps the scrolling behavior know where to scroll to.
   */
  buildItems: (query: string) => {
    items: I[];
    virtualItems: V[];
    virtualRows?: V[][];
  };
  selectedItem?: I;
  onSelect: (item?: I) => void;
  itemToString?: (item: I | null) => string;
  alwaysHighlight?: boolean;
  debounceMs?: number;
}) {
  const {
    listRef,
    selectedItem,
    itemToString,
    alwaysHighlight,
    buildItems,
    onSelect,
    debounceMs,
  } = opts;

  const [query, setQuery_] = React.useState("");
  const [outsideQuery, setOutsideQuery] = React.useState("");

  const setQuery = (val: string) => {
    setQuery_(val);
    debouncedSetOutsideQuery(val);
  };

  const debouncedSetOutsideQuery = debounce((val: string) => {
    setOutsideQuery(val);
  }, debounceMs);

  const { virtualItems, virtualRows, items } = React.useMemo(
    () => buildItems(query),
    [buildItems, query]
  );

  const itemToVirtualIndex = React.useMemo(
    () => buildItemIndexToVirtualIndexMap(virtualItems, items),
    [virtualItems, items]
  );

  const {
    highlightedIndex,
    setHighlightedIndex,
    getInputProps,
    getComboboxProps,
    getMenuProps,
    getItemProps,
  } = useCombobox({
    isOpen: true,
    defaultIsOpen: true,
    items,
    selectedItem,
    itemToString,
    defaultHighlightedIndex: selectedItem
      ? items.indexOf(selectedItem)
      : alwaysHighlight
      ? 0
      : undefined,
    onSelectedItemChange: ({ selectedItem: item }) => {
      if (item) {
        setQuery("");
        onSelect(item);
      }
    },
    stateReducer: (state, { type, changes }) => {
      if (
        type === useCombobox.stateChangeTypes.MenuMouseLeave ||
        type === useCombobox.stateChangeTypes.InputBlur
      ) {
        // If mouse is leaving, or we've just made a selection, then just
        // keep the highlight at the same place, by default, downshift will
        // reset highlightedIndex to -1. We keep it at the same place.
        return {
          ...changes,
          highlightedIndex,
        };
      } else if (
        type === useCombobox.stateChangeTypes.InputKeyDownEnter ||
        type === useCombobox.stateChangeTypes.ItemClick
      ) {
        // If we just made a selection, by default, downshift will reset
        // highlightedIndex to 0. We switch it to -1, so we don't render
        // the 0th item briefly highlighted.
        return {
          ...changes,
          highlightedIndex: -1,
        };
      }
      if (alwaysHighlight) {
        const willHaveNoHighlight =
          (!changes.highlightedIndex && highlightedIndex >= 0) ||
          (changes.highlightedIndex && changes.highlightedIndex < 0);
        if (willHaveNoHighlight && items.length > 0) {
          // We always want to make sure one item is highlighted.  If there will be
          // no highlight, then forcibly set the highlight to 0.  The only exception
          // is when the user presses Enter; in that case, we want to just have
          // nothing highlighted till the dropdown is closed.  There is some delay here
          // between the enter is pressed and the dropdown is closed, as closing goes
          // through the whole studioCtx.change() flow.
          return { ...changes, highlightedIndex: 0 };
        }
      }
      return changes;
    },
  });

  React.useEffect(() => {
    if (listRef.current) {
      const highlightedItem = items[highlightedIndex];

      if (virtualRows) {
        const virtualRow = virtualRows.findIndex((row) =>
          row.find((item) => highlightedItem === item.item)
        );
        if (virtualRow >= 0) {
          listRef.current.scrollToItem(virtualRow, "smart");
        }
      } else {
        const virtualIndex = virtualItems.findIndex(
          (item) => item.item === highlightedItem
        );

        if (virtualIndex >= 0) {
          listRef.current.scrollToItem(virtualIndex, "smart");
        }
      }
    }
  }, [highlightedIndex, virtualItems, listRef]);

  return {
    getInputProps: (options: UseComboboxGetInputPropsOptions) => {
      return getInputProps(
        combineProps(options, {
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Escape") {
              setQuery("");
            }
          },
          onChange: (e: React.FormEvent<HTMLInputElement>) => {
            e.stopPropagation();
            setQuery(e.currentTarget.value);
            if (
              listRef.current &&
              listRef.current instanceof VariableSizeList
            ) {
              // Item sizes are cached on the virtual list, but if the list changes -- by
              // filtering -- we need to invalidate the cache.
              listRef.current.resetAfterIndex(0, true);
            }
          },
          onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
            (e.nativeEvent as any).preventDownshiftDefault = true;
          },
          value: query,
        })
      );
    },
    getComboboxProps,
    getMenuProps,
    highlightedItemIndex: highlightedIndex,
    highlightedVirtualItemIndex: itemToVirtualIndex[highlightedIndex],
    query: outsideQuery,
    getItemProps,
    items,
    virtualItems,
    virtualRows,
    setHighlightedItemIndex: setHighlightedIndex,
    setQuery,
  };
}
