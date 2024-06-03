// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { App, withAppContext } from "@/wab/client/components/top-view";
import { ensure, safeCast } from "@/wab/common";
import L from "lodash";
import * as React from "react";
import { MouseEvent, ReactNode } from "react";
import { unstable_batchedUpdates } from "react-dom";
import {
  DraggableCore,
  DraggableCoreProps,
  DraggableData,
  DraggableEventHandler,
} from "react-draggable";
import UseKey from "react-use/lib/comps/UseKey";

interface DraggableState {
  initX: number;
  initY: number;
  started: boolean;
  /**
   * Whether the user hit Escape.  After this, started is false and no more drag
   * events are emitted.  This can be set even if started was false (but the
   * event is not emitted to the user).
   */
  aborted: boolean;
}

export type XDraggableData = DraggableState & {
  deltaX: number;
  deltaY: number;
};

export interface XDraggableEvent {
  mouseEvent: React.MouseEvent;
  draggableData: DraggableData;
  data: XDraggableData;
}

export type XDraggableEventHandler = (e: XDraggableEvent) => void;

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type XDraggableProps = Partial<
  Omit<DraggableCoreProps, "onStart" | "onStop" | "onDrag"> & {
    onDrag: XDraggableEventHandler;
    onStart: XDraggableEventHandler;
    onStop: XDraggableEventHandler;
    minPx: number;
    render: (lastEvent: XDraggableEvent | undefined) => ReactNode;
    useMovement?: boolean;
  }
> & {
  app: App;
  children?: React.ReactNode;
};

interface XDraggableState {
  lastEvent?: XDraggableEvent;
}

/**
 * Extras for React-Draggable.
 */
class _XDraggable extends React.Component<XDraggableProps, XDraggableState> {
  static defaultProps = {
    minPx: 4,
  };

  constructor(props: XDraggableProps) {
    super(props);
    this.state = {};
  }

  private snapshotEvent(xevent: XDraggableEvent) {
    this.setState({
      lastEvent: {
        ...xevent,
        mouseEvent: L.assignIn({}, xevent.mouseEvent),
      },
    });
  }

  private handleStart: DraggableEventHandler = (_e, data) => {
    unstable_batchedUpdates(() => {
      const e = safeCast(_e as MouseEvent);
      const newState: XDraggableData = {
        initX: e.pageX,
        initY: e.pageY,
        started: !this.props.minPx,
        aborted: false,
        deltaX: 0,
        deltaY: 0,
      };
      this.props.app.setIsDragging(true);
      const xevent = this.createData(e, data, newState);
      if (!this.props.minPx) {
        if (this.props.onStart) {
          this.props.onStart(xevent);
        }
      }
      this.snapshotEvent(xevent);
    });
  };

  /**
   * Note that this intentionally fires *either* onStart or onDrag and not both
   * in the same cycle.
   */
  private handleDrag: DraggableEventHandler = (_e, data) => {
    let toRet: boolean | undefined = undefined;
    unstable_batchedUpdates(() => {
      const e = safeCast(_e as MouseEvent);
      const lastEvent = ensure(this.state.lastEvent, "expected a lastEvent");
      if (lastEvent.data.aborted) {
        toRet = false;
        return;
      }
      const dx = this.props.useMovement
        ? lastEvent.data.deltaX + e.movementX
        : e.pageX - lastEvent.data.initX;
      const dy = this.props.useMovement
        ? lastEvent.data.deltaY + e.movementY
        : e.pageY - lastEvent.data.initY;
      let xevent = this.createData(e, data, {
        ...lastEvent.data,
      });
      if (
        !lastEvent.data.started &&
        this.props.minPx &&
        Math.sqrt(dx ** 2 + dy ** 2) >= this.props.minPx
      ) {
        xevent = { ...xevent, data: { ...xevent.data, started: true } };
        if (this.props.onStart) {
          this.props.onStart(xevent);
        }
      }
      if (lastEvent.data.started && this.props.onDrag) {
        this.props.onDrag(xevent);
      }
      this.snapshotEvent(xevent);
    });
    return toRet;
  };

  private handleStop: DraggableEventHandler = (_e, data) => {
    let toRet: boolean | undefined = undefined;
    unstable_batchedUpdates(() => {
      const e = safeCast(_e as MouseEvent);
      const lastEvent = ensure(this.state.lastEvent, "expected a lastEvent");
      if (lastEvent.data.aborted) {
        toRet = false;
        return;
      }
      this.props.app.setIsDragging(false);
      const xevent = this.createData(e, data, {
        ...lastEvent.data,
        started: false,
      });
      if (lastEvent.data.started) {
        if (this.props.onStop) {
          this.props.onStop(xevent);
        }
      }
      this.snapshotEvent(xevent);
    });
    return toRet;
  };

  private createData(
    mouseEvent: MouseEvent,
    draggableData: DraggableData,
    xdata = ensure(this.state.lastEvent, "expected a lastEvent").data
  ): XDraggableEvent {
    return {
      mouseEvent,
      draggableData,
      data: {
        ...xdata,
        deltaX: this.props.useMovement
          ? xdata.deltaX + mouseEvent.movementX
          : mouseEvent.pageX - xdata.initX,
        deltaY: this.props.useMovement
          ? xdata.deltaY + mouseEvent.movementY
          : mouseEvent.pageY - xdata.initY,
      },
    };
  }

  private handleEscape = (e: React.KeyboardEvent<HTMLElement>) => {
    unstable_batchedUpdates(() => {
      e.stopPropagation();
      this.props.app.setIsDragging(false);
      const lastEvent = ensure(this.state.lastEvent, "expected a lastEvent");
      const xevent: XDraggableEvent = {
        ...lastEvent,
        data: {
          ...lastEvent.data,
          started: false,
          aborted: true,
        },
      };
      if (lastEvent.data.started) {
        if (this.props.onStop) {
          this.props.onStop(xevent);
        }
      }
      this.snapshotEvent(xevent);
    });
  };

  render() {
    const { onStart, onStop, onDrag, minPx, ...props } = this.props;
    return (
      <>
        {this.state.lastEvent && this.state.lastEvent.data.started && (
          <UseKey filter={"Escape"} fn={this.handleEscape} />
        )}
        {/* @ts-ignore */}
        <DraggableCore
          {...props}
          // DraggableCore breaks input focus.  See https://github.com/mzabriskie/react-draggable/issues/410.
          enableUserSelectHack={false}
          onStart={this.handleStart}
          onDrag={this.handleDrag}
          onStop={this.handleStop}
        >
          {(this.props.render && this.props.render(this.state.lastEvent)) ||
            this.props.children}
        </DraggableCore>
      </>
    );
  }
}

export const XDraggable = withAppContext(_XDraggable);
