import * as React from "react";
import { ensure } from "../../../../common";
import { Box, Pt } from "../../../../geom";
import { AddTplItem } from "../../../definitions/insertables";
import { DragInsertManager } from "../../../Dnd";
import { StudioCtx } from "../../../studio-ctx/StudioCtx";
import { DragItem } from "../../widgets";

export function DraggableInsertable(props: {
  spec: AddTplItem;
  sc: StudioCtx;
  children: React.ReactNode;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  minPx?: number;
}) {
  const { spec, sc, onDragStart, onDragEnd, minPx } = props;
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
