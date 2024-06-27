import { ensure, spreadLog } from "@/wab/shared/common";
import {
  XDraggable,
  XDraggableEvent,
} from "@/wab/commons/components/XDraggable";
import L from "lodash";
import * as React from "react";
import * as ReactDOM from "react-dom";

interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

interface EllipseControlProps {
  ellipse: Ellipse;
  onChange: (ellipse: Ellipse) => void;
}

export class EllipseControl extends React.Component<EllipseControlProps> {
  svg: SVGElement | null = null;
  initEllipse: Ellipse | null = null;

  private getDragPcts(e: XDraggableEvent) {
    const orig = ensure(this.initEllipse);
    const area = (
      ReactDOM.findDOMNode(ensure(this.svg)) as SVGElement
    ).getBoundingClientRect();
    const dx = (e.data.deltaX / area.width) * 100;
    const dy = (e.data.deltaY / area.height) * 100;

    spreadLog({ ...e.data, ...area, dx, dy });
    return { orig, dx, dy };
  }

  private handleDragCenter = (e: XDraggableEvent) => {
    const { orig, dx, dy } = this.getDragPcts(e);
    this.props.onChange({
      ...orig,
      cx: L.clamp(orig.cx + dx, 0, 100),
      cy: L.clamp(orig.cy + dy, 0, 100),
    });
  };

  private handleDragKnobRight = (e: XDraggableEvent) => {
    const { orig, dx, dy } = this.getDragPcts(e);
    this.props.onChange({
      ...orig,
      rx: L.clamp(orig.rx + dx, orig.cx, 100 - orig.cx),
    });
  };

  private handleDragKnobBottom = (e: XDraggableEvent) => {
    const { orig, dx, dy } = this.getDragPcts(e);
    this.props.onChange({
      ...orig,
      ry: L.clamp(orig.ry + dy, orig.cy, 100 - orig.cy),
    });
  };

  private handleDragKnobLeft = (e: XDraggableEvent) => {
    const { orig, dx, dy } = this.getDragPcts(e);
    this.props.onChange({
      ...orig,
      rx: L.clamp(orig.rx - dx, 0, orig.cx),
    });
  };

  private handleDragKnobTop = (e: XDraggableEvent) => {
    const { orig, dx, dy } = this.getDragPcts(e);
    this.props.onChange({
      ...orig,
      ry: L.clamp(orig.ry - dy, 0, orig.cy),
    });
  };

  private handleDragStart = () => {
    this.initEllipse = L.clone(this.props.ellipse);
  };

  render() {
    const { cx, cy, rx, ry } = this.props.ellipse;
    const p = (x: number) => `${x}%`;
    const [px1, py1, prx, pry, right, bottom, left, top] = [
      cx,
      cy,
      rx,
      ry,
      cx + rx,
      cy + ry,
      cx - rx,
      cy - ry,
    ].map(p);

    return (
      <div className={"ellipse-control"}>
        <svg
          ref={(el: /*TWZ*/ SVGSVGElement | SVGSVGElement | null) =>
            (this.svg = el)
          }
          className={"ellipse-control__svg"}
        >
          <ellipse
            className={"ellipse-control__ellipse"}
            cx={px1}
            cy={py1}
            rx={prx}
            ry={pry}
          />
          <line
            className={"ellipse-control__line"}
            x1={left}
            y1={py1}
            x2={right}
            y2={py1}
          />
          <line
            className={"ellipse-control__line"}
            x1={px1}
            y1={top}
            x2={px1}
            y2={bottom}
          />
          <XDraggable
            onStart={this.handleDragStart}
            onDrag={this.handleDragCenter}
          >
            <circle
              className={"ellipse-control__center"}
              cx={px1}
              cy={py1}
              r={4}
            />
          </XDraggable>
          <XDraggable
            onStart={this.handleDragStart}
            onDrag={this.handleDragKnobRight}
          >
            <circle
              className={"ellipse-control__knob"}
              cx={right}
              cy={py1}
              r={4}
            />
          </XDraggable>
          <XDraggable
            onStart={this.handleDragStart}
            onDrag={this.handleDragKnobBottom}
          >
            <circle
              className={"ellipse-control__knob"}
              cx={px1}
              cy={bottom}
              r={4}
            />
          </XDraggable>
          <XDraggable
            onStart={this.handleDragStart}
            onDrag={this.handleDragKnobLeft}
          >
            <circle
              className={"ellipse-control__knob"}
              cx={left}
              cy={py1}
              r={4}
            />
          </XDraggable>
          <XDraggable
            onStart={this.handleDragStart}
            onDrag={this.handleDragKnobTop}
          >
            <circle
              className={"ellipse-control__knob"}
              cx={px1}
              cy={top}
              r={4}
            />
          </XDraggable>
        </svg>
      </div>
    );
  }
}
