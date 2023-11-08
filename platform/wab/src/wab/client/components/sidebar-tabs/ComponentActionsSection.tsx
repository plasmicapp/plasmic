import { isKnownRenderExpr } from "../../../classes";
/** @format */
import { Action, ActionProps, PlasmicElement } from "@plasmicapp/host";
import { notification } from "antd";
import domAlign from "dom-align";
import { observer } from "mobx-react-lite";
import React from "react";
import { useUnmount } from "react-use";
import { TplComponent } from "../../../classes";
import { ensure, hackyCast, maybe } from "../../../common";
import { isCodeComponent } from "../../../components";
import { $ } from "../../../deps";
import { BadRequestError } from "../../../shared/ApiErrors/errors";
import { elementSchemaToTpl } from "../../../shared/code-components/code-components";
import { getSlotParams } from "../../../shared/SlotUtils";
import { $$$ } from "../../../shared/TplQuery";
import { SlotSelection } from "../../../slots";
import { reportError } from "../../ErrorNotifications";
import { ViewCtx } from "../../studio-ctx/view-ctx";
import { TplExpsProvider } from "../style-controls/StyleComponent";
import Button from "../widgets/Button";
import { ConnectToDBTableModal } from "./DataSource/ConnectToDBTable";
import { updateOrCreateExpr } from "./PropEditorRow";

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
            {actions.map((action) => {
              if (action.type == "button-action") {
                return (
                  <ButtonAction
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
                    control={action.control}
                    componentPropValues={componentPropValues}
                    ccContextData={ccContextData}
                    viewCtx={viewCtx}
                    expsProvider={expsProvider}
                    tplComp={tpl}
                  />
                );
              } else if (hackyCast(action).type === "form-schema") {
                return <ConnectToDBTableModal viewCtx={viewCtx} tpl={tpl} />;
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

function useStudioOps(
  viewCtx: ViewCtx,
  node: HTMLDivElement | null,
  tplComp: TplComponent,
  expsProvider: TplExpsProvider
) {
  const canvasCtx = viewCtx.canvasCtx;
  const sub = canvasCtx.Sub;
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
    if (node) {
      sub.ReactDOM.render(
        sub.React.createElement(
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
        ),
        node
      );
    }
  }, [modalProps, sub, node, FullScreenModal]);

  useUnmount(() => node && sub.ReactDOM.unmountComponentAtNode(node));

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

  const updateProps = React.useCallback(
    (newValues: any) => {
      viewCtx.change(() => {
        if (typeof newValues === "object") {
          Object.keys(newValues).forEach((prop) => {
            const val = newValues[prop];
            const param = tplComp.component.params.find(
              (_param) => _param.variable.name === prop
            );

            if (param) {
              const vtm = viewCtx.variantTplMgr();
              if (val !== undefined) {
                const effectiveVs = expsProvider.effectiveVs();
                const arg = effectiveVs.args.find(
                  (_arg) => _arg.param === param
                );
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
            }
          });
        }
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
    }),
    [showModal, refreshQueryData, appendToSlot, removeFromSlotAt, updateProps]
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

  return (
    <>
      <Button
        onClick={() => {
          onClick({
            componentProps: componentPropValues,
            contextData: ccContextData,
            studioOps: studioOps,
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
  const modalContainerRef = React.useRef<HTMLDivElement>(null);
  const studioOps = useStudioOps(
    viewCtx,
    modalContainerRef.current,
    tplComp,
    expsProvider
  );

  React.useEffect(() => {
    const node = actionContainerRef.current;
    if (node) {
      sub.ReactDOM.render(
        sub.React.createElement(
          sub.GenericErrorBoundary,
          {
            className: "error-boundary",
          },
          sub.React.createElement(control, {
            componentProps: componentPropValues,
            contextData: ccContextData,
            studioOps: studioOps,
            // TODO: Remove `as any` once host is updated
            ...({ studioDocument: window.document } as any),
          })
        ),
        node
      );
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
