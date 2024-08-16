import { SubDeps } from "@/wab/client/components/canvas/subdeps";
import { useStudioOps } from "@/wab/client/components/sidebar-tabs/ComponentActionsSection";
import { TplExpsProvider } from "@/wab/client/components/style-controls/StyleComponent";
import { getRootSub } from "@/wab/client/frame-ctx/windows";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensure } from "@/wab/shared/common";
import { TplComponent } from "@/wab/shared/model/classes";
import type {
  CustomControl,
  StudioOps,
} from "@plasmicapp/host/dist/prop-types";
import domAlign from "dom-align";
import $ from "jquery";
import React, { useEffect } from "react";

interface CustomPropEditorProps {
  viewCtx?: ViewCtx;
  tpl: TplComponent;
  value: any;
  onChange: (v: any) => void;
  impl: CustomControl<any>;
  componentPropValues: any;
  ccContextData: any;
  propName: string;
}

export function CustomPropEditor(props: CustomPropEditorProps) {
  const { viewCtx } = props;
  const InnerComp = viewCtx ? (
    <InnerCustomPropEditorWithViewCtx {...props} viewCtx={viewCtx} />
  ) : (
    <InnerCustomPropEditor {...props} />
  );
  return InnerComp;
}

function InnerCustomPropEditorWithViewCtx({
  impl,
  tpl,
  onChange,
  value,
  viewCtx,
  componentPropValues,
  ccContextData,
  propName,
}: CustomPropEditorProps & { viewCtx: ViewCtx }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const expsProvider = new TplExpsProvider(viewCtx, tpl);
  const sub = viewCtx.canvasCtx.Sub;
  const studioOps = useStudioOps(
    viewCtx,
    containerRef.current,
    tpl,
    expsProvider
  );
  useCustomPropEditor(
    sub,
    containerRef,
    studioOps,
    value,
    onChange,
    impl,
    componentPropValues,
    ccContextData,
    propName
  );

  return <div ref={containerRef} style={{ display: "contents" }} />;
}

function InnerCustomPropEditor({
  impl,
  onChange,
  value,
  componentPropValues,
  ccContextData,
  propName,
}: CustomPropEditorProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const sub = getRootSub();
  useCustomPropEditor(
    sub,
    containerRef,
    null,
    value,
    onChange,
    impl,
    componentPropValues,
    ccContextData,
    propName
  );

  return <div ref={containerRef} style={{ display: "contents" }} />;
}

function useCustomPropEditor(
  sub: SubDeps,
  containerRef: React.RefObject<HTMLDivElement>,
  studioOps: StudioOps | null,
  value: any,
  onChange: (v: any) => void,
  impl: CustomControl<any>,
  componentPropValues: any,
  ccContextData: any,
  propName: string
) {
  const studioCtx = useStudioCtx();
  const projectData = studioCtx.getProjectData();
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
          // TODO: Remove as any
          sub.React.createElement(impl, {
            value,
            componentProps: componentPropValues,
            contextData: ccContextData,
            updateValue: onChange,
            FullscreenModal,
            SideModal,
            studioOps,
            projectData: projectData,
            studioDocument: window.document,
          } as any)
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
