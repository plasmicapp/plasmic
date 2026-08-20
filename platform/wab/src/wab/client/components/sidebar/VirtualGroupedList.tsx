import ListSectionHeader from "@/wab/client/components/ListSectionHeader";
import { ListSpace } from "@/wab/client/components/widgets/ListStack";
import { sum } from "lodash";
import React from "react";
import { ListChildComponentProps, VariableSizeList } from "react-window";

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
  key: string;
  group: Group<G, I>;
  item: Item<I>;
}
type Row<G, I> = Item<I> | Group<G, I> | GroupedItem<G, I>;

export interface VirtualGroupedListHandle {
  scrollTo: (key: string) => void;
}

type RenderRow = (index: number, style: React.CSSProperties) => React.ReactNode;

function ListRow({ data, index, style }: ListChildComponentProps) {
  const renderRow: RenderRow = data;
  return <>{renderRow(index, style)}</>;
}

/** The groups enclosing `key`, outermost first; `undefined` if not found. */
function groupsContaining<G, I>(
  itemsOrGroups: ItemOrGroup<G, I>[],
  key: string,
  enclosing: Group<G, I>[] = []
): Group<G, I>[] | undefined {
  for (const itemOrGroup of itemsOrGroups) {
    if (itemOrGroup.key === key) {
      return enclosing;
    }
    if (itemOrGroup.type === "group") {
      const found = groupsContaining(itemOrGroup.items, key, [
        ...enclosing,
        itemOrGroup,
      ]);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

export function VirtualGroupedList<I, G>(props: {
  items: (Item<I> | Group<G, I>)[];
  renderItem: (item: I, group: Group<G, I> | undefined) => React.ReactNode;
  itemHeight: number;
  renderGroupHeader: (group: G) => React.ReactNode;
  headerHeight: number;
  hideEmptyGroups?: boolean;
  forceExpandAll?: boolean;
  handleRef?: React.Ref<VirtualGroupedListHandle>;
}) {
  const {
    items,
    renderItem,
    itemHeight,
    renderGroupHeader,
    headerHeight,
    hideEmptyGroups,
    forceExpandAll,
    handleRef,
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
            key: itemOrGroup.key,
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

  const pendingScrollKey = React.useRef<string | undefined>(undefined);

  const scrollToRow = (key: string) => {
    const index = flattenedItems.findIndex((row) =>
      row.type === "grouped_item" ? row.item.key === key : row.key === key
    );
    if (index < 0 || !listRef.current) {
      return false;
    }
    listRef.current.scrollToItem(index, "smart");
    return true;
  };

  const scrollToPending = () => {
    const key = pendingScrollKey.current;
    if (key !== undefined && scrollToRow(key)) {
      pendingScrollKey.current = undefined;
    }
  };

  React.useImperativeHandle(handleRef, () => ({
    scrollTo: (key: string) => {
      const enclosing = groupsContaining(items, key);
      if (enclosing === undefined) {
        return;
      }
      pendingScrollKey.current = key;
      // A collapsed group renders no rows, so expand all enclosing groups one on the way down
      if (enclosing.length) {
        setCollapsed((prev) => ({
          ...prev,
          ...Object.fromEntries(enclosing.map((group) => [group.key, false])),
        }));
      }
      // scroll to the item on the next render
      scrollToPending();
    },
  }));

  React.useEffect(scrollToPending, [collapsed]);

  React.useEffect(() => {
    if (listRef.current) {
      // When the sizes of the items in the list change, we need to reset
      // the cached state of the virtual list
      listRef.current.resetAfterIndex(0);
    }
  }, [JSON.stringify(flattenedSizes)]);

  const renderRow: RenderRow = (index, style) => {
    const row = flattenedItems[index];
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
        <li style={{ ...style }}>{renderItem(row.item.item, row.group)}</li>
      );
    } else {
      return <li style={{ ...style }}>{renderItem(row.item, undefined)}</li>;
    }
  };

  return (
    <ListSpace space={totalSpace}>
      {({ height }) => (
        <VariableSizeList
          height={height}
          itemData={renderRow}
          itemSize={itemSizer}
          layout="vertical"
          width="100%"
          overscanCount={2}
          itemCount={flattenedItems.length}
          itemKey={(index) => flattenedItems[index].key}
          estimatedItemSize={itemHeight}
          ref={listRef}
        >
          {ListRow}
        </VariableSizeList>
      )}
    </ListSpace>
  );
}
