import { DataDragTargeting, DragInsertManager } from "@/wab/client/Dnd";
import {
  DataDragPayload,
  getDataDropTargetRegistry,
} from "@/wab/client/components/sidebar-tabs/DataBinding/data-drop";
import { DragItem } from "@/wab/client/components/widgets";
import { AddTplItem } from "@/wab/client/definitions/insertables";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure, maybeInstance } from "@/wab/shared/common";
import { Box, Pt } from "@/wab/shared/geom";
import { ok } from "neverthrow";
import * as React from "react";

export interface DraggableInsertableProps {
  spec: AddTplItem;
  shouldInterceptInsert?: (item: AddTplItem) => boolean;
  sc: StudioCtx;
  /** Set when dragging data out of the data picker. */
  dataDrag?: DataDragTargeting;
  dataDragPayload?: DataDragPayload;
  children: React.ReactNode;
  onDragStart?: (spec: AddTplItem) => void;
  onDragEnd?: (
    spec: AddTplItem,
    result: ReturnType<DragInsertManager["endDrag"]>,
  ) => void;
  minPx?: number;
}

export function DraggableInsertable(props: DraggableInsertableProps) {
  const {
    spec,
    shouldInterceptInsert,
    sc,
    dataDrag,
    dataDragPayload,
    onDragStart,
    onDragEnd,
    minPx,
  } = props;
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
        if (dataDragPayload) {
          getDataDropTargetRegistry(sc).beginDrag(dataDragPayload);
        }
        previousDragOps.current = previousDragOps.current.then(async () => {
          const dragMgr = await DragInsertManager.build(
            sc,
            spec,
            undefined,
            dataDrag,
          );
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
              () => "Expected `dragManagerRef.current` to exist",
            );
            if (
              !Box.fromRect(
                sc.canvasClipper().getBoundingClientRect(),
              ).contains(new Pt(e.mouseEvent.clientX, e.mouseEvent.clientY))
            ) {
              manager.clear();
              if (dataDragPayload) {
                getDataDropTargetRegistry(sc).drag(
                  dataDragPayload,
                  new Pt(e.mouseEvent.clientX, e.mouseEvent.clientY),
                );
              }
            } else {
              if (dataDragPayload) {
                getDataDropTargetRegistry(sc).clearHover();
              }
              manager.drag(
                new Pt(e.mouseEvent.pageX, e.mouseEvent.pageY),
                e.mouseEvent,
              );
            }
          }),
        );
        await previousDragOps.current;
      }}
      onDragEnd={async (e) => {
        previousDragOps.current = previousDragOps.current.then(async () => {
          if (e.data.aborted) {
            await sc.changeUnsafe(() => {
              if (dataDragPayload) {
                getDataDropTargetRegistry(sc).clear();
              }
              dragManagerRef.current?.clear();
              dragManagerRef.current = undefined;
              sc.stopUnlogged();
              sc.setIsDraggingObject(false);
              onDragEnd?.(spec, undefined);
            });
            return;
          }
          if (shouldInterceptInsert && shouldInterceptInsert(spec)) {
            // If it was intercepted, we simulate a normal drag end.
            if (dataDragPayload) {
              getDataDropTargetRegistry(sc).clear();
            }
            sc.stopUnlogged();
            sc.setIsDraggingObject(false);
            const result = ensure(
              dragManagerRef.current,
              () => "Expected `dragManagerRef.current` to exist",
            ).endDrag();
            dragManagerRef.current = undefined;
            onDragEnd && onDragEnd(spec, result);
            return;
          }

          const manager = dragManagerRef.current;
          const vc = manager?.tentativeVc;
          if (dataDragPayload && !e.data.aborted) {
            const clientPt = new Pt(e.mouseEvent.clientX, e.mouseEvent.clientY);
            if (
              !Box.fromRect(
                sc.canvasClipper().getBoundingClientRect(),
              ).contains(clientPt)
            ) {
              manager?.clear();
              const registry = getDataDropTargetRegistry(sc);
              registry.drag(dataDragPayload, clientPt);
              await sc.change(() => {
                sc.stopUnlogged();
                sc.setIsDraggingObject(false);
                registry.drop(dataDragPayload, clientPt);
                return ok();
              });
              dragManagerRef.current = undefined;
              onDragEnd?.(spec, undefined);
              return;
            }
          }
          if (dataDragPayload) {
            getDataDropTargetRegistry(sc).clear();
          }
          if (vc) {
            // Focus the canvas so keyboard shortcuts (e.g undo) work immediately
            maybeInstance(document.activeElement, HTMLElement, (ae) =>
              ae.blur(),
            );
          }
          const extraInfo = spec.asyncExtraInfo
            ? await spec.asyncExtraInfo(sc)
            : undefined;
          if (extraInfo === false) {
            await sc.changeUnsafe(() => {
              manager?.clear();
              dragManagerRef.current = undefined;
              sc.stopUnlogged();
              sc.setIsDraggingObject(false);
              onDragEnd?.(spec, undefined);
            });
            return;
          }
          await sc.changeUnsafe(() => {
            sc.stopUnlogged();
            sc.setIsDraggingObject(false);
            const result = (() => {
              if (vc) {
                return ensure(
                  dragManagerRef.current,
                  () => "Expected `dragManagerRef.current` to exist",
                ).endDrag(spec, extraInfo);
              }
              return ensure(
                dragManagerRef.current,
                () => "Expected `dragManagerRef.current` to exist",
              ).endDrag();
            })();
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
