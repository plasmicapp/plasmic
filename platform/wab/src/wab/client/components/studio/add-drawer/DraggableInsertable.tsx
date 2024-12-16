import { DragItem } from "@/wab/client/components/widgets";
import { AddTplItem } from "@/wab/client/definitions/insertables";
import { DragInsertManager } from "@/wab/client/Dnd";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensure } from "@/wab/shared/common";
import { Box, Pt } from "@/wab/shared/geom";
import { TplNode } from "@/wab/shared/model/classes";
import * as React from "react";

export interface DraggableInsertableProps {
  spec: AddTplItem;
  shouldInterceptInsert?: (item: AddTplItem) => boolean;
  sc: StudioCtx;
  children: React.ReactNode;
  onDragStart?: (spec: AddTplItem) => void;
  onDragEnd?: (
    spec: AddTplItem,
    result: [ViewCtx, TplNode] | undefined
  ) => void;
  minPx?: number;
}

export function DraggableInsertable(props: DraggableInsertableProps) {
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
            onDragStart && onDragStart(spec);
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
            const result = ensure(
              dragManagerRef.current,
              () => "Expected `dragManagerRef.current` to exist"
            ).endDrag();
            dragManagerRef.current = undefined;
            onDragEnd && onDragEnd(spec, result);
            return;
          }

          const manager = dragManagerRef.current;
          const vc = manager?.tentativeVc;
          const extraInfo = spec.asyncExtraInfo
            ? await spec.asyncExtraInfo(sc)
            : undefined;
          if (extraInfo === false) {
            return;
          }
          await sc.changeUnsafe(() => {
            sc.stopUnlogged();
            sc.setIsDraggingObject(false);
            const result = (() => {
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
            if (!result) {
              return;
            }
            dragManagerRef.current = undefined;
            onDragEnd && onDragEnd(spec, result);
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
