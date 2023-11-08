import React from "react";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";

/* react-beautiful-dnd has issues with SSR:
 - https://github.com/atlassian/react-beautiful-dnd/issues/2092#issuecomment-1023169662 */
function NoSSR(props: {
  children: React.ReactElement;
  onSSR?: React.ReactElement;
}) {
  const { onSSR = <></>, children } = props;
  const [canRender, setCanRender] = React.useState(false);
  React.useEffect(() => {
    setCanRender(true);
  }, []);
  return canRender ? children : onSSR;
}

export function SimpleReorderableList(props: {
  onReordered: (fromIndex: number, toIndex: number) => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  customDragHandle?: boolean;
  as?: React.ElementType;
}) {
  const { onReordered, children, customDragHandle } = props;
  const Container = props.as ?? "ul";
  const childrenArray = React.useMemo(
    () => React.Children.toArray(children),
    [children]
  );

  /* In some cases, dragging item was disappearing:
   - https://github.com/atlassian/react-beautiful-dnd/issues/1003
   - https://github.com/atlassian/react-beautiful-dnd/blob/master/docs/guides/reparenting.md */
  const getRenderItem = React.useCallback(
    (items) => (provided, snapshot, rubric) =>
      (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...(customDragHandle ? {} : provided.dragHandleProps)}
          style={axisLockedStyle(provided.draggableProps.style)}
        >
          {React.cloneElement(
            items[rubric.source.index] as React.ReactElement,
            {
              ...(customDragHandle
                ? { dragHandleProps: provided.dragHandleProps }
                : {}),
              isDragging: snapshot.isDragging,
            }
          )}
        </div>
      ),
    [customDragHandle]
  );
  const renderItem = getRenderItem(childrenArray);
  return (
    <NoSSR>
      <DragDropContext
        onDragEnd={(result) => {
          if (!result.destination || !result.source) {
            return;
          }
          onReordered(result.source.index, result.destination.index);
        }}
      >
        <Droppable droppableId={"list"} renderClone={renderItem}>
          {(provided) => (
            <Container
              className={props.className}
              style={props.style}
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {React.Children.map(children, (child, index) => {
                const key =
                  (React.isValidElement(child) ? child.key : undefined) ??
                  index;
                return (
                  <Draggable key={key} draggableId={`${key}`} index={index}>
                    {renderItem}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </Container>
          )}
        </Droppable>
      </DragDropContext>
    </NoSSR>
  );
}

export function axisLockedStyle(style?: React.CSSProperties) {
  if (!style) {
    return undefined;
  } else if (style.transform) {
    return {
      ...style,
      transform: `translate(0px${style.transform.slice(
        style.transform.indexOf(",")
      )}`,
    };
  } else {
    return style;
  }
}
