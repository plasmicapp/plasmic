import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensure } from "@/wab/shared/common";
import { CustomControl } from "@plasmicapp/host/dist/prop-types";
import domAlign from "dom-align";
import $ from "jquery";
import React, { useEffect } from "react";

interface CustomPropEditorProps {
  value: any;
  onChange: (v: any) => void;
  viewCtx: ViewCtx;
  impl: CustomControl<any>;
  componentPropValues: any;
  ccContextData: any;
  propName: string;
  readOnly?: boolean;
}

export function CustomPropEditor({
  impl,
  onChange,
  value,
  viewCtx,
  componentPropValues,
  ccContextData,
  propName,
}: CustomPropEditorProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const sub = viewCtx.canvasCtx.Sub;
  const FullscreenModal = React.useMemo(
    () =>
      sub.createModal({
        $,
        containerSelector: ".canvas-editor",
        title: propName,
        studioDocument: document,
        domAlign,
        popupWidth: 520,
      }),
    [sub]
  );
  const SideModal = React.useMemo(
    () =>
      sub.createModal({
        $,
        containerSelector: ".canvas-editor__right-pane",
        title: propName,
        studioDocument: document,
        domAlign,
      }),
    [sub]
  );

  // Must not use useUnmount due to React 17 cleanup: https://reactjs.org/blog/2020/08/10/react-v17-rc.html#effect-cleanup-timing
  useEffect(() => {
    const container = ensure(containerRef.current, "Must be mounted");
    return () => {
      sub.ReactDOM.unmountComponentAtNode(container);
    };
  }, []);
  React.useEffect(() => {
    if (containerRef.current) {
      const node = containerRef.current;
      sub.ReactDOM.render(
        sub.React.createElement(
          sub.GenericErrorBoundary,
          {
            className: "error-boundary",
          },
          sub.React.createElement(impl, {
            value,
            componentProps: componentPropValues,
            contextData: ccContextData,
            updateValue: onChange,
            FullscreenModal,
            SideModal,
            studioDocument: window.document,
          })
        ),
        node
      );
    }
  }, [
    containerRef.current,
    value,
    componentPropValues,
    ccContextData,
    onChange,
    sub,
  ]);
  return <div ref={containerRef} style={{ display: "contents" }} />;
}
