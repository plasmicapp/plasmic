import ListSectionHeader from "@/wab/client/components/ListSectionHeader";
import { ListSpace } from "@/wab/client/components/widgets/ListStack";
import { sum } from "lodash";
import React from "react";
import { VariableSizeList } from "react-window";

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

interface GroupedItem<G, I> {
  type: "grouped_item";
  group: Group<G, I>;
  item: Item<I>;
}
type Row<G, I> = Item<I> | Group<G, I> | GroupedItem<G, I>;

export function VirtualGroupedList<I, G>(props: {
  items: (Item<I> | Group<G, I>)[];
  renderItem: (item: I, group: Group<G, I> | undefined) => React.ReactNode;
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

  const flattenItems = (
    itemsOrGroups: ItemOrGroup<G, I>[],
    group?: Group<G, I>
  ): Row<G, I>[] => {
    return itemsOrGroups.flatMap((itemOrGroup) => {
      if (itemOrGroup.type === "item") {
        if (group) {
          return {
            type: "grouped_item",
            group,
            item: itemOrGroup,
          };
        } else {
          return itemOrGroup;
        }
      } else if (hideEmptyGroups && itemOrGroup.items.length === 0) {
        return [];
      } else {
        return [
          itemOrGroup,
          ...(isCollapsed(itemOrGroup)
            ? []
            : flattenItems(itemOrGroup.items, itemOrGroup)),
        ];
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
            const row: Row<G, I> = data[index];
            if (row.type === "group") {
              return (
                <ListSectionHeader
                  className={row.items.length > 0 ? "pointer" : undefined}
                  collapseState={isCollapsed(row) ? "collapsed" : "expanded"}
                  onToggle={() =>
                    setCollapsed({
                      ...collapsed,
                      [row.key]: !collapsed[row.key],
                    })
                  }
                  style={style}
                >
                  {renderGroupHeader(row.group)}
                </ListSectionHeader>
              );
            } else if (row.type === "grouped_item") {
              return (
                <li style={{ ...style }}>
                  {renderItem(row.item.item, row.group)}
                </li>
              );
            } else {
              return (
                <li style={{ ...style }}>{renderItem(row.item, undefined)}</li>
              );
            }
          }}
        </VariableSizeList>
      )}
    </ListSpace>
  );
}
