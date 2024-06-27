import { axisLockedStyle } from "@/wab/client/components/widgets/SimpleReorderableList";
import { ensure } from "@/wab/shared/common";
import React from "react";
import {
  DragDropContext,
  Draggable,
  DraggableProvidedDragHandleProps,
  Droppable,
} from "react-beautiful-dnd";
import { areEqual, FixedSizeList } from "react-window";

export function SimpleReorderableVirtualList<T>(props: {
  onReordered: (fromIndex: number, toIndex: number) => void;
  items: T[];
  height: number | string;
  itemSize: number;
  children: (props: {
    item: T;
    isDragging?: boolean;
    dragHandleProps?: DraggableProvidedDragHandleProps;
  }) => React.ReactElement;
  itemKey: (item: T) => string;
  className?: string;
  style?: React.CSSProperties;
  customDragHandle?: boolean;
}) {
  const {
    onReordered,
    items,
    height,
    itemSize,
    children,
    className,
    style,
    itemKey,
    customDragHandle,
  } = props;
  return (
    <ListContext.Provider
      value={{ renderer: children, itemKey, customDragHandle }}
    >
      <DragDropContext
        onDragEnd={(result) => {
          if (!result.destination || !result.source) {
            return;
          }
          onReordered(result.source.index, result.destination.index);
        }}
      >
        <Droppable
          droppableId={"list"}
          mode="virtual"
          renderClone={(provided, snapshot, rubric) => (
            <li
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              style={axisLockedStyle(provided.draggableProps.style)}
            >
              {children({
                item: items[rubric.source.index],
                isDragging: snapshot.isDragging,
              })}
            </li>
          )}
        >
          {(droppableProvided, droppableSnapshot) => (
            <FixedSizeList
              className={className}
              style={style}
              outerRef={droppableProvided.innerRef}
              height={
                height === "100%"
                  ? itemSize *
                    (droppableSnapshot.isUsingPlaceholder
                      ? items.length + 1
                      : items.length)
                  : height
              }
              itemCount={
                droppableSnapshot.isUsingPlaceholder
                  ? items.length + 1
                  : items.length
              }
              itemSize={itemSize}
              itemData={items}
              layout="vertical"
              width="100%"
              overscanCount={2}
            >
              {Row}
            </FixedSizeList>
          )}
        </Droppable>
      </DragDropContext>
    </ListContext.Provider>
  );
}

interface ListContextValue<T> {
  renderer: (props: {
    item: T;
    isDragging?: boolean;
    dragHandleProps?: DraggableProvidedDragHandleProps;
  }) => React.ReactElement;
  itemKey: (item: T) => string;
  customDragHandle?: boolean;
}

const ListContext = React.createContext<ListContextValue<any> | undefined>(
  undefined
);

const Row = React.memo(function Row<T>(props: {
  data: T[];
  index: number;
  style: React.CSSProperties;
}) {
  const { data, index, style } = props;
  const { renderer, itemKey, customDragHandle } = ensure(
    React.useContext(ListContext)
  );
  const item = data[index];
  if (!item) {
    return null;
  }
  const key = itemKey(item);
  return (
    <Draggable draggableId={key} index={index} key={key}>
      {(provided, snapshot) => (
        <li
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...(customDragHandle ? {} : provided.dragHandleProps)}
          style={{
            ...style,
            ...axisLockedStyle(provided.draggableProps.style),
          }}
        >
          {renderer({
            item,
            isDragging: snapshot.isDragging,
            dragHandleProps: customDragHandle
              ? provided.dragHandleProps
              : undefined,
          })}
        </li>
      )}
    </Draggable>
  );
},
areEqual);
