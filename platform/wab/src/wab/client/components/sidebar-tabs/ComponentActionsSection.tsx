import {
  isKnownNamedState,
  isKnownRenderExpr,
} from "@/wab/shared/model/classes";
/** @format */
import { reportError } from "@/wab/client/ErrorNotifications";
import { ConnectToDBTableModal } from "@/wab/client/components/sidebar-tabs/DataSource/ConnectToDBTable";
import { updateOrCreateExpr } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { TplExpsProvider } from "@/wab/client/components/style-controls/StyleComponent";
import Button from "@/wab/client/components/widgets/Button";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import { getSlotParams } from "@/wab/shared/SlotUtils";
import { $$$ } from "@/wab/shared/TplQuery";
import { elementSchemaToTpl } from "@/wab/shared/code-components/code-components";
import { ensure, hackyCast, maybe } from "@/wab/shared/common";
import { isCodeComponent } from "@/wab/shared/core/components";
import { SlotSelection } from "@/wab/shared/core/slots";
import { TplComponent } from "@/wab/shared/model/classes";
import { Action, ActionProps, PlasmicElement } from "@plasmicapp/host";
import { notification } from "antd";
import domAlign from "dom-align";
import $ from "jquery";
import { observer } from "mobx-react";
import React from "react";
import { Root } from "react-dom/client";
import { useUnmount } from "react-use";

export const ComponentActionsSection = observer(
  function ComponentActionsSection(props: {
    viewCtx: ViewCtx;
    tpl: TplComponent;
    customTitle?: React.ReactNode;
    expsProvider: TplExpsProvider;
    componentPropValues: Record<string, any>;
    ccContextData: any;
    actions: Action<any>[];
  }) {
    const {
      viewCtx,
      tpl,
      expsProvider,
      actions,
      componentPropValues,
      ccContextData,
    } = props;
    return (
      <>
        {
          <div className="flex-col gap-xsm mb-xsm">
            {actions.map((action, idx) => {
              if (action.type == "button-action") {
                return (
                  <ButtonAction
                    key={`${idx}${action.label}`}
                    label={action.label}
                    onClick={action.onClick}
                    componentPropValues={componentPropValues}
                    ccContextData={ccContextData}
                    viewCtx={viewCtx}
                    expsProvider={expsProvider}
                    tplComp={tpl}
                  />
                );
              } else if (action.type == "custom-action") {
                return (
                  <CustomAction
                    key={idx}
                    control={action.control}
                    componentPropValues={componentPropValues}
                    ccContextData={ccContextData}
                    viewCtx={viewCtx}
                    expsProvider={expsProvider}
                    tplComp={tpl}
                  />
                );
              } else if (hackyCast(action).type === "form-schema") {
                return (
                  <ConnectToDBTableModal
                    key={idx}
                    viewCtx={viewCtx}
                    tpl={tpl}
                  />
                );
              } else {
                return null;
              }
            })}
          </div>
        }
      </>
    );
  }
);

export function useStudioOps(
  viewCtx: ViewCtx,
  node: HTMLDivElement | null,
  tplComp: TplComponent,
  expsProvider: TplExpsProvider
): ActionProps<any>["studioOps"] {
  const canvasCtx = viewCtx.canvasCtx;
  const sub = canvasCtx.Sub;
  const root = React.useRef<Root | null>(null);
  const [modalProps, setModalProps] = React.useState<null | {
    onClose?: () => void;
  }>(null);
  const showModal = React.useCallback(
    (props) => setModalProps(props),
    [setModalProps]
  );

  const FullScreenModal = React.useMemo(
    () =>
      sub.createModal({
        $,
        containerSelector: ".canvas-editor",
        title: "",
        studioDocument: document,
        domAlign,
        popupWidth: 1024,
      }),
    [sub]
  );

  React.useEffect(() => {
    if (!node) {
      return;
    }
    if (sub.ReactDOMClient && !root.current) {
      root.current = sub.ReactDOMClient.createRoot(node);
    }
    const renderElement = sub.React.createElement(
      sub.GenericErrorBoundary,
      {
        className: "error-boundary",
      },
      sub.React.createElement(FullScreenModal, {
        ...modalProps,
        show: !!modalProps,
        onClose: () => {
          modalProps?.onClose?.();
          setModalProps(null);
        },
      })
    );
    if (root.current) {
      root.current.render(renderElement);
    } else if (sub.ReactDOM.render) {
      sub.ReactDOM.render(renderElement, node);
    }
  }, [modalProps, sub, node, FullScreenModal]);

  useUnmount(() => {
    if (root.current) {
      root.current.unmount();
    } else if (node && sub.ReactDOM.unmountComponentAtNode) {
      sub.ReactDOM.unmountComponentAtNode(node);
    }
  });

  const refreshQueryData = React.useCallback(
    () => canvasCtx.refreshFetchedDataFromPlasmicQuery(),
    [canvasCtx]
  );

  const appendToSlot = React.useCallback(
    (element: PlasmicElement, slotName: string) => {
      const ownerComp =
        viewCtx.currentComponentCtx()?.component() ?? viewCtx.component;
      const maybeError = elementSchemaToTpl(viewCtx.site, ownerComp, element, {
        codeComponentsOnly: false,
      });
      if (maybeError.result.isError) {
        throw new BadRequestError(maybeError.result.error.message);
      }
      const { tpl, warnings: componentWarnings } = maybeError.result.value;

      componentWarnings.forEach((err) => {
        notification.error({
          message: err.message,
          description: err.description,
          duration: 0,
        });
        if (err.shouldLogError) {
          reportError(new Error(err.message));
        }
      });

      const slotSel = new SlotSelection({
        tpl: tplComp,
        slotParam: ensure(
          getSlotParams(tplComp.component).find(
            (p) => p.variable.name === slotName
          ),
          `Component must have a param named "${slotName}"`
        ),
      });

      viewCtx.change(() => {
        viewCtx.getViewOps().tryInsertAsChild(tpl, slotSel);
        viewCtx.setStudioFocusByTpl(tplComp);
      });
    },
    [viewCtx]
  );

  const removeFromSlotAt = React.useCallback(
    (pos: number, slotName: string) => {
      viewCtx.change(() => {
        const arg = $$$(tplComp).getSlotArg(slotName);
        const slotElements =
          arg && isKnownRenderExpr(arg.expr) ? arg.expr.tpl : [];
        if (pos >= 0 && pos < slotElements.length) {
          $$$(slotElements[pos]).tryRemove({ deep: true });
        } else {
          notification.error({
            message: "Invalid child index",
            description:
              slotElements.length > 0
                ? "Index should be between 0 and " + (slotElements.length - 1)
                : "Slot is empty",
            duration: 0,
          });
        }
      });
    },
    [viewCtx]
  );

  const updateStates = React.useCallback(
    (newValues: any) => {
      if (typeof newValues !== "object") {
        return;
      }
      Object.keys(newValues).forEach((stateName) => {
        const val = newValues[stateName];
        const state = tplComp.component.states.find(
          (_state) => isKnownNamedState(_state) && _state.name === stateName
        );
        if (!state) {
          return;
        }
        const implicitState = viewCtx
          .currentComponent()
          .states.find((_state) => _state.implicitState === state);
        if (!implicitState) {
          return;
        }
        viewCtx.setCanvasStateValue(implicitState, val);
      });
    },
    [viewCtx, expsProvider, tplComp]
  );

  const updateProps = React.useCallback(
    (newValues: any) => {
      const vtm = viewCtx.variantTplMgr();
      viewCtx.change(() => {
        if (typeof newValues !== "object") {
          return;
        }
        Object.keys(newValues).forEach((prop) => {
          const val = newValues[prop];
          const param = tplComp.component.params.find(
            (_param) => _param.variable.name === prop
          );
          if (!param) {
            return;
          }
          if (val !== undefined) {
            const effectiveVs = expsProvider.effectiveVs();
            const arg = effectiveVs.args.find((_arg) => _arg.param === param);
            const curExpr =
              maybe(arg, (x) => x.expr) ||
              (isCodeComponent(tplComp.component) && param.defaultExpr) ||
              undefined;

            const newExpr = updateOrCreateExpr(
              curExpr,
              param.type,
              val,
              tplComp,
              viewCtx
            );

            vtm.setArg(tplComp, param.variable, newExpr);
          } else {
            vtm.delArg(tplComp, param.variable);
          }
        });
      });
    },
    [viewCtx, expsProvider, tplComp]
  );

  const studioOps = React.useMemo(
    () => ({
      showModal,
      refreshQueryData,
      appendToSlot,
      removeFromSlotAt,
      updateProps,
      updateStates,
    }),
    [
      showModal,
      refreshQueryData,
      appendToSlot,
      removeFromSlotAt,
      updateProps,
      updateStates,
    ]
  );
  return studioOps;
}

function ButtonAction<P>({
  label,
  onClick,
  componentPropValues,
  ccContextData,
  viewCtx,
  expsProvider,
  tplComp,
}: {
  label: string;
  onClick: (props: ActionProps<P>) => void;
  componentPropValues: P;
  ccContextData: any;
  viewCtx: ViewCtx;
  expsProvider: TplExpsProvider;
  tplComp: TplComponent;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const studioOps = useStudioOps(
    viewCtx,
    containerRef.current,
    tplComp,
    expsProvider
  );
  const projectData = viewCtx.studioCtx.getProjectData();

  return (
    <>
      <Button
        onClick={() => {
          onClick({
            componentProps: componentPropValues,
            contextData: ccContextData,
            studioOps: studioOps,
            projectData: projectData,
            studioDocument: document,
          });
        }}
      >
        {label}
      </Button>
      <div ref={containerRef} style={{ display: "contents" }} />
    </>
  );
}

function CustomAction<P>({
  control,
  componentPropValues,
  ccContextData,
  viewCtx,
  expsProvider,
  tplComp,
}: {
  control: React.ComponentType<ActionProps<P>>;
  componentPropValues: P;
  ccContextData: any;
  viewCtx: ViewCtx;
  expsProvider: TplExpsProvider;
  tplComp: TplComponent;
}) {
  const sub = viewCtx.canvasCtx.Sub;
  const actionContainerRef = React.useRef<HTMLDivElement>(null);
  const actionRoot = React.useRef<Root | null>(null);
  const modalContainerRef = React.useRef<HTMLDivElement>(null);
  const studioOps = useStudioOps(
    viewCtx,
    modalContainerRef.current,
    tplComp,
    expsProvider
  );
  const projectData = viewCtx.studioCtx.getProjectData();

  React.useEffect(() => {
    const node = actionContainerRef.current;
    if (!node) {
      return;
    }
    if (sub.ReactDOMClient && !actionRoot.current) {
      actionRoot.current = sub.ReactDOMClient.createRoot(node);
    }
    const renderElement = sub.React.createElement(
      sub.GenericErrorBoundary,
      {
        className: "error-boundary",
      },
      sub.React.createElement(control, {
        componentProps: componentPropValues,
        contextData: ccContextData,
        studioOps: studioOps,
        projectData: projectData,
        studioDocument: window.document,
      })
    );
    if (actionRoot.current) {
      actionRoot.current.render(renderElement);
    } else if (sub.ReactDOM.render) {
      sub.ReactDOM.render(renderElement, node);
    }
  }, [
    actionContainerRef.current,
    componentPropValues,
    ccContextData,
    studioOps,
    sub,
  ]);

  return (
    <>
      <div ref={actionContainerRef} style={{ display: "contents" }} />
      <div ref={modalContainerRef} style={{ display: "contents" }} />
    </>
  );
}
