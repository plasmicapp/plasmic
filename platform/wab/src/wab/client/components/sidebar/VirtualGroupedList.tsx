import { sum } from "lodash";
import React from "react";
import { VariableSizeList } from "react-window";
import ListSectionHeader from "../ListSectionHeader";
import { ListSpace } from "../widgets/ListStack";

export interface Item<I> {
  type: "item";
  key: string;
  item: I;
}
export interface Group<G, I> {
  type: "group";
  group: G;
  key: string;
  items: ItemOrGroup<G, I>[];
  defaultCollapsed?: boolean;
}

export type ItemOrGroup<G, I> = Item<I> | Group<G, I>;

export function VirtualGroupedList<I, G>(props: {
  items: (Item<I> | Group<G, I>)[];
  renderItem: (item: I) => React.ReactNode;
  itemHeight: number;
  renderGroupHeader: (group: G) => React.ReactNode;
  headerHeight: number;
  hideEmptyGroups?: boolean;
  forceExpandAll?: boolean;
}) {
  const {
    items,
    renderItem,
    itemHeight,
    renderGroupHeader,
    headerHeight,
    hideEmptyGroups,
    forceExpandAll,
  } = props;

  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>(
    Object.fromEntries(
      items
        .filter((item): item is Group<G, I> => item.type === "group")
        .map((item) => [item.key, item.defaultCollapsed ?? false])
    )
  );

  const isCollapsed = (item: Group<G, I>) => {
    return !forceExpandAll && collapsed[item.key];
  };

  const flattenItems = (itms: ItemOrGroup<G, I>[]): ItemOrGroup<G, I>[] => {
    return itms.flatMap((item) => {
      if (item.type === "item") {
        return item;
      } else if (hideEmptyGroups && item.items.length === 0) {
        return [];
      } else {
        return [item, ...(isCollapsed(item) ? [] : flattenItems(item.items))];
      }
    });
  };

  const flattenedItems = flattenItems(items);
  const flattenedSizes = flattenedItems.map((item) =>
    item.type === "group" ? headerHeight : itemHeight
  );

  const totalSpace = sum(flattenedSizes);

  const itemSizer = (index: number) => {
    const item = flattenedItems[index];
    if (item.type === "group") {
      return headerHeight;
    } else {
      return itemHeight;
    }
  };

  const listRef = React.useRef<VariableSizeList>(null);

  React.useEffect(() => {
    if (listRef.current) {
      // When the sizes of the items in the list change, we need to reset
      // the cached state of the virtual list
      listRef.current.resetAfterIndex(0);
    }
  }, [JSON.stringify(flattenedSizes)]);

  return (
    <ListSpace space={totalSpace}>
      {({ height }) => (
        <VariableSizeList
          height={height}
          itemData={flattenedItems}
          itemSize={itemSizer}
          layout="vertical"
          width="100%"
          overscanCount={2}
          itemCount={flattenedItems.length}
          itemKey={(index, data) => data[index].key}
          estimatedItemSize={itemHeight}
          ref={listRef}
        >
          {({ data, index, style }) => {
            const item = data[index];
            if (item.type === "group") {
              return (
                <ListSectionHeader
                  collapseState={isCollapsed(item) ? "collapsed" : "expanded"}
                  onToggle={() =>
                    setCollapsed({
                      ...collapsed,
                      [item.key]: !collapsed[item.key],
                    })
                  }
                  style={style}
                >
                  {renderGroupHeader(item.group)}
                </ListSectionHeader>
              );
            } else {
              return <li style={{ ...style }}>{renderItem(item.item)}</li>;
            }
          }}
        </VariableSizeList>
      )}
    </ListSpace>
  );
}
