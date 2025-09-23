import React, { cloneElement, useEffect, useRef, useState } from "react";
import type { Key, ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
import { isElement } from "react-dom/test-utils";
import {
  closestCenter,
  DragOverlay,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import type {
  SortingStrategy,
  AnimateLayoutChanges,
  NewIndexGetter,
} from "@dnd-kit/sortable";
import {
  arrayMove,
  useSortable,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import { DataProvider, useSelector } from "@plasmicapp/host";

import type {
  DraggableSyntheticListeners,
  Active,
  Announcements,
  CollisionDetection,
  DropAnimation,
  KeyboardCoordinateGetter,
  Modifiers,
  MeasuringConfiguration,
  PointerActivationConstraint,
  ScreenReaderInstructions,
  UniqueIdentifier,
} from "@dnd-kit/core";
import type { Transform } from "@dnd-kit/utilities";
import {
  restrictToFirstScrollableAncestor,
  restrictToHorizontalAxis,
  restrictToParentElement,
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from "@dnd-kit/modifiers";
import { Registerable, registerComponentHelper } from "./util";

export interface ItemProps {
  dragOverlay?: boolean;
  color?: string;
  disabled?: boolean;
  dragging?: boolean;
  height?: number;
  index?: number;
  fadeIn?: boolean;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  sorting?: boolean;
  style?: React.CSSProperties;
  transition?: string | null;
  wrapperStyle?: React.CSSProperties;
  value: React.ReactNode;
  renderItem?(
    args: {
      dragOverlay: boolean;
      dragging: boolean;
      sorting: boolean;
      index: number | undefined;
      fadeIn: boolean;
      listeners: DraggableSyntheticListeners;
      ref: React.Ref<HTMLElement>;
      style: React.CSSProperties | undefined;
      transform: ItemProps["transform"];
      transition: ItemProps["transition"];
      value: ItemProps["value"];
    },
    currentItem: ItemProps["value"]
  ): React.ReactElement;
}

export const Item = React.memo(
  React.forwardRef<HTMLLIElement, ItemProps>(
    (
      {
        color,
        dragOverlay,
        dragging,
        disabled,
        fadeIn,
        height,
        index,
        listeners,
        renderItem = () => <div />,
        sorting,
        style,
        transition,
        transform,
        value,
        wrapperStyle,
        ...props
      },
      ref
    ) => {
      useEffect(() => {
        if (!dragOverlay) {
          return;
        }

        document.body.style.cursor = "grabbing";

        return () => {
          document.body.style.cursor = "";
        };
      }, [dragOverlay]);

      const child = renderItem(
        {
          dragOverlay: Boolean(dragOverlay),
          dragging: Boolean(dragging),
          sorting: Boolean(sorting),
          index,
          fadeIn: Boolean(fadeIn),
          listeners,
          ref,
          style,
          transform,
          transition,
          value,
        },
        value
      );

      return isElement(child)
        ? cloneElement(child, {
            ref,
            style: {
              transition: [transition].filter(Boolean).join(", "),
              transform: `translate3d(${transform?.x ?? 0}px, ${
                transform?.y ?? 0
              }px, 0) scaleX(${transform?.scaleX ?? 1}) scaleY(${
                transform?.scaleY ?? 1
              }`,
            },
          })
        : child;
    }
  )
);

export interface SortableProps {
  onReorder?: (
    fromIndex: number,
    toIndex: number,
    newItems: any[],
    oldItems: any[]
  ) => void;
  themeResetClass?: string;
  activationConstraint?: PointerActivationConstraint;
  animateLayoutChanges?: AnimateLayoutChanges;
  adjustScale?: boolean;
  collisionDetection?: CollisionDetection;
  coordinateGetter?: KeyboardCoordinateGetter;
  Container?: any; // To-do: Fix me
  dropAnimation?: DropAnimation | null;
  getNewIndex?: NewIndexGetter;
  rowKey?: (item: any) => Key;
  itemCount?: number;
  items?: any[];
  measuring?: MeasuringConfiguration;
  modifiers?: Modifiers;
  renderItem?: any;
  removable?: boolean;
  reorderItems?: typeof arrayMove;
  strategy?: SortingStrategy;
  style?: React.CSSProperties;
  useDragOverlay?: boolean;
  modifierNames?: (
    | "restrictToHorizontalAxis"
    | "restrictToVerticalAxis"
    | "restrictToWindowEdges"
    | "restrictToParentElement"
    | "restrictToFirstScrollableAncestor"
  )[];
  getItemStyles?(args: {
    id: UniqueIdentifier;
    index: number;
    isSorting: boolean;
    isDragOverlay: boolean;
    overIndex: number;
    isDragging: boolean;
  }): React.CSSProperties;
  wrapperStyle?(args: {
    active: Pick<Active, "id"> | null;
    index: number;
    isDragging: boolean;
    id: UniqueIdentifier;
  }): React.CSSProperties;
  isDisabled?(id: UniqueIdentifier): boolean;
  className?: string;
}

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
};

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable: `
    To pick up a sortable item, press the space bar.
    While sorting, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.
  `,
};

export const modifierByName = {
  restrictToVerticalAxis,
  restrictToWindowEdges,
  restrictToHorizontalAxis,
  restrictToParentElement,
  restrictToFirstScrollableAncestor,
};

export function Sortable({
  className,
  style,
  activationConstraint,
  animateLayoutChanges,
  adjustScale = false,
  collisionDetection = closestCenter,
  coordinateGetter = sortableKeyboardCoordinates,
  dropAnimation = dropAnimationConfig,
  getNewIndex,
  rowKey = (item) => item.id,
  items: initialItems = [],
  measuring,
  modifiers,
  removable,
  renderItem,
  reorderItems = arrayMove,
  strategy = rectSortingStrategy,
  useDragOverlay = true,
  modifierNames,
  themeResetClass,
  onReorder,
}: SortableProps) {
  modifiers =
    modifiers ?? (modifierNames ?? []).map((name) => modifierByName[name]);

  // This is the optimistic version.
  const [items, setItems] = useState<UniqueIdentifier[]>(() => initialItems);
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint,
    }),
    useSensor(TouchSensor, {
      activationConstraint,
    }),
    useSensor(KeyboardSensor, {
      // Disable smooth scrolling in Cypress automated tests
      scrollBehavior: "Cypress" in globalThis ? "auto" : undefined,
      coordinateGetter,
    })
  );
  const isFirstAnnouncement = useRef(true);
  const getIndex = (id: UniqueIdentifier) =>
    items.findIndex((item) => rowKey(item) === id);
  const getPosition = (id: UniqueIdentifier) => getIndex(id) + 1;
  const activeIndex = activeId ? getIndex(activeId) : -1;
  const announcements: Announcements = {
    onDragStart({ active: { id } }) {
      return `Picked up sortable item ${String(
        id
      )}. Sortable item ${id} is in position ${getPosition(id)} of ${
        items.length
      }`;
    },
    onDragOver({ active, over }) {
      // In this specific use-case, the picked up item's `id` is always the same as the first `over` id.
      // The first `onDragOver` event therefore doesn't need to be announced, because it is called
      // immediately after the `onDragStart` announcement and is redundant.
      if (isFirstAnnouncement.current === true) {
        isFirstAnnouncement.current = false;
        return;
      }

      if (over) {
        return `Sortable item ${
          active.id
        } was moved into position ${getPosition(over.id)} of ${items.length}`;
      }

      return;
    },
    onDragEnd({ active, over }) {
      if (over) {
        return `Sortable item ${
          active.id
        } was dropped at position ${getPosition(over.id)} of ${items.length}`;
      }

      return;
    },
    onDragCancel({ active: { id } }) {
      return `Sorting was cancelled. Sortable item ${id} was dropped and returned to position ${getPosition(
        id
      )} of ${items.length}.`;
    },
  };
  useEffect(() => {
    if (!activeId) {
      isFirstAnnouncement.current = true;
    }
  }, [activeId]);

  return (
    <div className={className} style={style}>
      <DndContext
        accessibility={{
          announcements,
          screenReaderInstructions,
        }}
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={({ active }) => {
          if (!active) {
            return;
          }

          setActiveId(active.id);
        }}
        onDragEnd={({ over }) => {
          setActiveId(null);

          if (over) {
            const overIndex = getIndex(over.id);
            const reordered = reorderItems(items, activeIndex, overIndex);
            onReorder?.(activeIndex, overIndex, reordered, items);
            if (activeIndex !== overIndex) {
              setItems((items) => reordered);
            }
          }
        }}
        onDragCancel={() => setActiveId(null)}
        measuring={measuring}
        modifiers={modifiers}
      >
        <SortableContext items={items.map(rowKey)} strategy={strategy}>
          {items.map((value, index) => (
            <SortableItem
              key={rowKey(value)}
              id={rowKey(value)}
              value={value}
              index={index}
              renderItem={renderItem}
              animateLayoutChanges={animateLayoutChanges}
              useDragOverlay={useDragOverlay}
              getNewIndex={getNewIndex}
            />
          ))}
        </SortableContext>
        {useDragOverlay && typeof document !== "undefined"
          ? createPortal(
              <DragOverlay
                adjustScale={adjustScale}
                dropAnimation={dropAnimation}
              >
                {activeId ? (
                  <Item
                    index={activeIndex}
                    value={items[activeIndex]}
                    renderItem={(...args) => (
                      <div className={themeResetClass}>
                        {renderItem(...args)}
                      </div>
                    )}
                    dragOverlay
                  />
                ) : null}
              </DragOverlay>,
              document.body
            )
          : null}
      </DndContext>
    </div>
  );
}

interface SortableItemProps {
  animateLayoutChanges?: AnimateLayoutChanges;
  getNewIndex?: NewIndexGetter;
  id: UniqueIdentifier;
  index: number;
  useDragOverlay?: boolean;
  renderItem?(args: any): React.ReactElement;
  value?: any;
}

export function SortableItem({
  animateLayoutChanges,
  getNewIndex,
  id,
  value,
  index,
  renderItem,
  useDragOverlay,
}: SortableItemProps) {
  const sortableData = useSortable({
    id,
    animateLayoutChanges,
    getNewIndex,
  });
  const {
    attributes,
    isDragging,
    isSorting,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = sortableData;

  return (
    <DataProvider hidden={true} name={"sortableItem"} data={sortableData}>
      <Item
        ref={setNodeRef}
        value={value}
        dragging={isDragging}
        sorting={isSorting}
        renderItem={renderItem}
        index={index}
        transform={transform}
        transition={transition}
        listeners={listeners}
        data-index={index}
        data-id={id}
        dragOverlay={!useDragOverlay && isDragging}
        {...attributes}
      />
    </DataProvider>
  );
}

export function SortableHandle({ children }: { children?: ReactNode }) {
  const data = useSelector("sortableItem");
  const child = React.Children.toArray(children)[0];
  return isElement(child)
    ? cloneElement(child as ReactElement, {
        ...data?.listeners,
        ref: data?.setActivatorNodeRef,
        tabIndex: 0,
      })
    : null;
}

export function registerSortable(loader?: Registerable) {
  registerComponentHelper(loader, SortableHandle, {
    name: "SortableHandle",
    props: {
      children: {
        type: "slot",
        defaultValue: {
          type: "text",
          value: "Handle",
        },
        mergeWithParent: true,
      } as any,
    },
    importPath: "@plasmicpkgs/dnd-kit",
    importName: "SortableHandle",
  });

  registerComponentHelper(loader, Sortable, {
    name: "Sortable",
    props: {
      items: {
        type: "array",
        defaultValue: [
          { id: 1, name: "hello" },
          { id: 2, name: "world" },
        ],
      },
      modifierNames: {
        displayName: "Options",
        type: "choice",
        multiSelect: true,
        options: Object.keys(modifierByName).map((v) => ({
          value: v,
          label:
            v[0].toUpperCase() + v.slice(1).replace(/([a-z])([A-Z])/g, "$1 $2"),
        })),
      },
      onReorder: {
        type: "eventHandler",
        argTypes: [
          {
            name: "fromIndex",
            type: "number",
          },
          {
            name: "toIndex",
            type: "number",
          },
          {
            name: "newItems",
            type: "object",
          },
          {
            name: "oldItems",
            type: "object",
          },
        ],
      },
      themeResetClass: {
        type: "themeResetClass",
      },
      renderItem: {
        type: "slot",
        renderPropParams: ["sortableData", "currentItem"],
        mergeWithParent: true,
        defaultValue: {
          type: "hbox",
          children: [
            {
              type: "text",
              value: "Item",
            },
            {
              type: "component",
              name: "SortableHandle",
            },
          ],
        },
      } as any,
    },
    importPath: "@plasmicpkgs/dnd-kit",
    importName: "Sortable",
  });
}
