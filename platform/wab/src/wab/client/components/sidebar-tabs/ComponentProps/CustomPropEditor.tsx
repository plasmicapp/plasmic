import { SubDeps } from "@/wab/client/components/canvas/subdeps";
import { useStudioOps } from "@/wab/client/components/sidebar-tabs/ComponentActionsSection";
import { TplExpsProvider } from "@/wab/client/components/style-controls/StyleComponent";
import { getRootSub } from "@/wab/client/frame-ctx/windows";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { TplComponent } from "@/wab/shared/model/classes";
import type {
  CustomControl,
  StudioOps,
} from "@plasmicapp/host/dist/prop-types";
import domAlign from "dom-align";
import $ from "jquery";
import React from "react";
import { Root } from "react-dom/client";

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
  const actionRef = React.useRef<HTMLDivElement>(null);
  const propRef = React.useRef<HTMLDivElement>(null);
  const expsProvider = new TplExpsProvider(viewCtx, tpl);
  const sub = viewCtx.canvasCtx.Sub;
  const studioOps = useStudioOps(viewCtx, actionRef.current, tpl, expsProvider);
  useCustomPropEditor(
    sub,
    propRef,
    studioOps,
    value,
    onChange,
    impl,
    componentPropValues,
    ccContextData,
    propName
  );

  return (
    <>
      <div ref={actionRef} style={{ display: "contents" }} />
      <div ref={propRef} style={{ display: "contents" }} />
    </>
  );
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
  const root = React.useRef<Root | null>(null);
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

  React.useEffect(() => {
    return () => {
      if (root.current) {
        root.current.unmount();
      } else if (containerRef.current && sub.ReactDOM.unmountComponentAtNode) {
        sub.ReactDOM.unmountComponentAtNode(containerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    if (sub.ReactDOMClient && !root.current) {
      root.current = sub.ReactDOMClient.createRoot(containerRef.current);
    }
    const renderElement = sub.React.createElement(
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
        studioOps,
        projectData: projectData,
        studioDocument: window.document,
      })
    );
    if (root.current) {
      root.current.render(renderElement);
    } else {
      sub.ReactDOM.render(renderElement, containerRef.current);
    }
  }, [
    containerRef.current,
    value,
    componentPropValues,
    ccContextData,
    onChange,
    sub,
  ]);
}
