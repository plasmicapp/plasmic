import { DragItem } from "@/wab/client/components/widgets";
import { AddTplItem } from "@/wab/client/definitions/insertables";
import { DragInsertManager } from "@/wab/client/Dnd";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure } from "@/wab/shared/common";
import { Box, Pt } from "@/wab/shared/geom";
import * as React from "react";

export function DraggableInsertable(props: {
  spec: AddTplItem;
  shouldInterceptInsert?: (item: AddTplItem) => boolean;
  sc: StudioCtx;
  children: React.ReactNode;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  minPx?: number;
}) {
  const { spec, shouldInterceptInsert, sc, onDragStart, onDragEnd, minPx } =
    props;
  const dragManagerRef = React.useRef<DragInsertManager>();
  // `onDrag` might run before `onDragStart` finishes since
  // `DragInsertManager.build` is async, so we chain the drag operations
  // to make sure they run in sequentially.
  const previousDragOps = React.useRef<Promise<void>>(Promise.resolve());

  return (
    <DragItem
      minPx={minPx}
      key={spec.key}
      onDragStart={async () => {
        previousDragOps.current = previousDragOps.current.then(async () => {
          const dragMgr = await DragInsertManager.build(sc, spec);
          await sc.changeUnsafe(() => {
            sc.startUnlogged();
            dragManagerRef.current = dragMgr;
            sc.setIsDraggingObject(true);
            onDragStart && onDragStart();
          });
        });
        await previousDragOps.current;
      }}
      onDrag={async (e) => {
        previousDragOps.current = previousDragOps.current.then(() =>
          sc.changeUnsafe(() => {
            const manager = ensure(
              dragManagerRef.current,
              () => "Expected `dragManagerRef.current` to exist"
            );
            if (
              !Box.fromRect(
                sc.canvasClipper().getBoundingClientRect()
              ).contains(new Pt(e.mouseEvent.clientX, e.mouseEvent.clientY))
            ) {
              manager.clear();
            } else {
              manager.drag(
                new Pt(e.mouseEvent.pageX, e.mouseEvent.pageY),
                e.mouseEvent
              );
            }
          })
        );
        await previousDragOps.current;
      }}
      onDragEnd={async () => {
        previousDragOps.current = previousDragOps.current.then(async () => {
          if (shouldInterceptInsert && shouldInterceptInsert(spec)) {
            // If it was intercepted, we simulate a normal drag end.
            sc.stopUnlogged();
            sc.setIsDraggingObject(false);
            ensure(
              dragManagerRef.current,
              () => "Expected `dragManagerRef.current` to exist"
            ).endDrag();
            dragManagerRef.current = undefined;
            onDragEnd && onDragEnd();
            return;
          }

          const manager = dragManagerRef.current;
          const vc = manager?.tentativeVc;
          const extraInfo = manager?.extraInfo;
          if (extraInfo === false) {
            return;
          }
          await sc.changeUnsafe(() => {
            sc.stopUnlogged();
            sc.setIsDraggingObject(false);
            const r = (() => {
              if (vc) {
                return ensure(
                  dragManagerRef.current,
                  () => "Expected `dragManagerRef.current` to exist"
                ).endDrag(spec, extraInfo);
              }
              return ensure(
                dragManagerRef.current,
                () => "Expected `dragManagerRef.current` to exist"
              ).endDrag();
            })();
            if (!r) {
              return;
            }
            dragManagerRef.current = undefined;
            onDragEnd && onDragEnd();
          });
        });
        await previousDragOps.current;
      }}
      dragHandle={() => (
        <div className={"component-drag-handle"}>
          <div className="create-item__icon">{spec.icon}</div>
          {spec.displayLabel ?? spec.label}
        </div>
      )}
    >
      {props.children}
    </DragItem>
  );
}
