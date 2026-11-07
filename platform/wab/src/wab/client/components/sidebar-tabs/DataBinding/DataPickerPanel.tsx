import {
  BottomPanelTabContext,
  useBottomPanel,
  useBottomPanelActions,
} from "@/wab/client/components/BottomPanel";
import {
  BottomPanelTabConfig,
  currentSelection,
} from "@/wab/client/components/BottomPanelState";
import { isContextMenuOpen } from "@/wab/client/components/ContextMenu";
import {
  BindingPreviewContext,
  BindingTarget,
  createBindingSession,
  isBindingTarget,
} from "@/wab/client/components/editor-sessions/binding-session";
import DataPicker, {
  DataPickerProps,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import sty from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerPanel.module.scss";
import { DataPickerRunCodeActionContext } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerRunCodeActionContext";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { useViewCtxMaybe } from "@/wab/client/contexts/StudioContexts";
import LayersSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__LayersSvg";
import {
  RightTabKey,
  useStudioCtxMaybe,
} from "@/wab/client/studio-ctx/StudioCtx";
import { zIndex } from "@/wab/client/z-index";
import { ensure } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { Popover } from "antd";
import classNames from "classnames";
import { noop } from "lodash";
import { computed, observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import React from "react";

const DataPickerPanelContext = React.createContext(false);
export function DataPickerPanelProvider(props: { children?: React.ReactNode }) {
  return (
    <DataPickerPanelContext.Provider value={true}>
      {props.children}
    </DataPickerPanelContext.Provider>
  );
}

interface DataPickerTriggerProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  /** Tab label; says which field is being edited, e.g. `span › Content`. */
  title: string;
  picker: DataPickerProps;
  /** The field the picker was opened from; rendered as-is. */
  children?: React.ReactNode;
}

export interface DataPickerTriggerHandle {
  open: () => void;
}

export const DataPickerTrigger = React.forwardRef<
  DataPickerTriggerHandle,
  DataPickerTriggerProps
>(function DataPickerTrigger(props, ref) {
  const docked =
    DEVFLAGS.dockview && !!React.useContext(DataPickerPanelContext);
  const { visible: _visible, setVisible: _setVisible, ...dockedProps } = props;
  return docked ? (
    <DataPickerDockTrigger {...dockedProps} ref={ref} />
  ) : (
    <DataPickerPopoverTrigger {...props} ref={ref} />
  );
});

/** Floats the picker over the canvas while the `dockview` devflag is off. */
const DataPickerPopoverTrigger = React.forwardRef<
  DataPickerTriggerHandle,
  DataPickerTriggerProps
>(function DataPickerPopoverTrigger(
  { visible, setVisible, picker, children },
  ref,
) {
  React.useImperativeHandle(ref, () => ({ open: () => setVisible(true) }), [
    setVisible,
  ]);
  const justOpenedRef = React.useRef(false);
  const pendingCloseRef = React.useRef(false);
  const justOpenedTimeoutRef = React.useRef<number>();
  React.useEffect(
    () => () => window.clearTimeout(justOpenedTimeoutRef.current),
    [],
  );
  return (
    <Popover
      zIndex={zIndex.dataPicker}
      content={
        // Detach from an enclosing modal so the picker can't touch its auto-save.
        <BottomPanelTabContext.Provider value={undefined}>
          <DataPicker {...picker} />
        </BottomPanelTabContext.Provider>
      }
      trigger="click"
      visible={visible}
      onVisibleChange={(newVisible) => {
        if (newVisible) {
          // The trigger toggles, so a double click would close right away.
          window.clearTimeout(justOpenedTimeoutRef.current);
          justOpenedRef.current = true;
          pendingCloseRef.current = false;
          justOpenedTimeoutRef.current = window.setTimeout(() => {
            justOpenedRef.current = false;
            if (pendingCloseRef.current) {
              pendingCloseRef.current = false;
              setVisible(false);
            }
          }, 500);
          setVisible(true);
        } else if (!isContextMenuOpen()) {
          // Context menus (e.g. the data inspector's insert/copy menu) are portaled to body, so
          // Popover sees clicks on them as outside clicks.
          if (justOpenedRef.current) {
            // Don't drop a legitimate outside close during the double-click guard, replay it as
            // soon as the guard expires.
            pendingCloseRef.current = true;
          } else {
            setVisible(false);
          }
        }
      }}
      destroyTooltipOnHide={true}
      overlayClassName="data-picker-popover-overlay"
    >
      {children}
    </Popover>
  );
});

const DataPickerDockTrigger = observer(
  React.forwardRef<
    DataPickerTriggerHandle,
    Omit<DataPickerTriggerProps, "visible" | "setVisible">
  >(function DataPickerDockTrigger({ title, picker, children }, ref) {
    const panel = useBottomPanelActions();
    const { stack } = useBottomPanel();
    const contextViewCtx = useViewCtxMaybe();
    const studioCtx = useStudioCtxMaybe();
    const runCodeContext = React.useContext(DataPickerRunCodeActionContext);
    const enclosing = React.useContext(BottomPanelTabContext);
    const viewCtx = picker.viewCtx ?? enclosing?.viewCtx ?? contextViewCtx;
    const cloneKey = viewCtx?.focusedTpl()
      ? viewCtx.focusedCloneKey()
      : undefined;
    const fieldKey = React.useId();
    const key = `binding-${picker.target?.key ?? `${fieldKey}-${viewCtx?.focusedTpl()?.uuid ?? ""}`}`;
    const owns = stack.some((entry) => entry.id === key);
    // Only transient editors (e.g. Slate chips) refresh callbacks from their parent.
    // Model bindings derive their data and mutations from the pinned target.
    React.useLayoutEffect(() => {
      const entry = stack.find((entry) => entry.id === key);
      const content = entry?.content;
      if (
        content?.kind === "binding" &&
        !("target" in content) &&
        entry?.viewCtx === viewCtx &&
        content.cloneKey === cloneKey
      ) {
        runInAction(() => {
          content.props = picker;
          content.runCodeContext = runCodeContext;
        });
      }
    });
    const open = () => {
      if (owns) {
        void panel.activate(key);
        return;
      }
      const target = isBindingTarget(picker.target) ? picker.target : undefined;
      const selection = enclosing?.session
        ? undefined
        : currentSelection(viewCtx);
      const preview = target
        ? { ...target.context, cloneKey: viewCtx?.focusedCloneKey() }
        : selection;
      let content: BindingPanelDescriptor;
      if (target) {
        const pinnedPreview = ensure(preview, "Missing binding preview");
        content = {
          kind: "binding",
          target,
          preview: pinnedPreview,
          options: {
            expectedValues: picker.expectedValues,
            hideStateSwitch: picker.hideStateSwitch,
            hidePreview: picker.hidePreview,
            context: picker.context,
            forDataRepCollection: picker.forDataRepCollection,
          },
          session: createBindingSession(
            {
              value: target.value(),
              data: target.data(pinnedPreview),
              initialMode: picker.initialMode,
              target,
              onChange: target.write,
              onCancel: noop,
            },
            viewCtx,
          ),
        };
      } else {
        const callbackContent: CallbackBindingPanelDescriptor =
          observable.object(
            {
              kind: "binding",
              props: picker,
              runCodeContext,
              cloneKey,
              preview,
              session: createBindingSession(
                {
                  ...picker,
                  onChange: (value) => callbackContent.props.onChange(value),
                },
                viewCtx,
                { parentDraft: !!enclosing?.session, studioCtx },
              ),
            },
            {},
            { deep: false },
          );
        content = callbackContent;
      }
      void panel.open(key, {
        title,
        bound: true,
        session: content.session,
        viewCtx: target?.context.viewCtx ?? viewCtx,
        selection,
        "data-test-id": "data-picker-panel",
        content,
      });
    };
    React.useImperativeHandle(ref, () => ({ open }));
    if (
      React.isValidElement<{
        className?: string;
        onClick?: React.MouseEventHandler;
      }>(children) &&
      children.type !== React.Fragment
    ) {
      return React.cloneElement(children, {
        className: classNames(children.props.className, {
          [sty.BoundInput]: owns,
        }),
        "data-dockview-bound-input": owns,
      } as React.HTMLAttributes<HTMLElement>);
    }
    return <>{children}</>;
  }),
);

type BindingPanelOptions = Pick<
  DataPickerProps,
  | "expectedValues"
  | "hideStateSwitch"
  | "hidePreview"
  | "context"
  | "forDataRepCollection"
>;

interface CallbackBindingPanelDescriptor {
  kind: "binding";
  props: DataPickerProps;
  runCodeContext?: React.ContextType<typeof DataPickerRunCodeActionContext>;
  session: ReturnType<typeof createBindingSession>;
  cloneKey?: string;
  preview?: BindingPreviewContext;
}

export type BindingPanelDescriptor =
  | CallbackBindingPanelDescriptor
  | {
      kind: "binding";
      target: BindingTarget;
      options: BindingPanelOptions;
      session: ReturnType<typeof createBindingSession>;
      preview: BindingPreviewContext;
    };

export const BindingPanelContent = observer(function BindingPanelContent({
  config,
  content,
}: {
  config: BottomPanelTabConfig;
  content: BindingPanelDescriptor;
}) {
  const panel = useBottomPanelActions();
  const target = "target" in content ? content.target : undefined;
  const props: DataPickerProps =
    "target" in content
      ? {
          ...content.options,
          target: content.target,
          value: content.target.value(),
          onChange: content.target.write,
          onCancel: noop,
          withAddQuery: true,
          onAddQuery: () => {
            const { viewCtx, component } = content.target.context;
            void viewCtx.studioCtx.changeUnsafe(() => {
              viewCtx.studioCtx.newlyAddedQuery = viewCtx.studioCtx
                .tplMgr()
                .addComponentServerQuery(component);
              viewCtx.studioCtx.switchRightTab(RightTabKey.component);
            });
          },
        }
      : content.props;
  const selection = content.preview;
  const { viewCtx, tpl, cloneKey, component } = selection ?? {};
  const available =
    viewCtx &&
    tpl &&
    viewCtx.studioCtx.viewCtxs.includes(viewCtx) &&
    viewCtx.currentComponent() === component &&
    (!cloneKey ||
      viewCtx
        .maybeTpl2ValsInContext(tpl, {
          anchorCloneKey: cloneKey,
          ignoreFocusedCloneKey: true,
        })
        .some((val) => val.fullKey === cloneKey));
  const cancel = () => {
    if (panel.discard(config.id) && !target) {
      props.onCancel();
    }
  };
  const unlink = target ? target.unlink : props.onUnlink;
  const onDelete = props.onDelete;
  return (
    <EscapeScope onEscape={cancel}>
      {selection && !available && (
        <div role="status">
          Preview unavailable for the original canvas context.
        </div>
      )}
      <DataPickerRunCodeActionContext.Provider
        value={"target" in content ? undefined : content.runCodeContext}
      >
        <DataPicker
          {...props}
          viewCtx={config.viewCtx}
          session={content.session}
          previewTpl={tpl}
          previewComponent={component}
          data={
            selection && !available
              ? undefined
              : target
                ? target.data(ensure(selection, "Missing binding preview"))
                : props.data
          }
          schema={target ? target.schema() : props.schema}
          docked
          saveAndClose={() => panel.saveAndClose(config.id)}
          onCancel={cancel}
          onDelete={
            onDelete &&
            (() => {
              void panel.performAndDiscard(config.id, onDelete);
            })
          }
          onUnlink={
            unlink &&
            (() => {
              void panel.performAndDiscard(config.id, unlink);
            })
          }
        />
      </DataPickerRunCodeActionContext.Provider>
    </EscapeScope>
  );
});

function EscapeScope(props: {
  onEscape: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ height: "100%" }}
      // Capture, because the picker's ModalScope stops key events from bubbling.
      onKeyDownCapture={(e) => {
        if (
          e.key === "Escape" &&
          !(e.target as HTMLElement).closest?.(".monaco-editor")
        ) {
          e.stopPropagation();
          props.onEscape();
        }
      }}
    >
      {props.children}
    </div>
  );
}

/** The standalone data panel, including env of the current canvas focus. */
export const DataBrowseContent = observer(function DataBrowseContent() {
  const panel = useBottomPanelActions();
  const viewCtx = useViewCtxMaybe();
  const focusedTpl =
    viewCtx?.focusedTpls().length === 1 ? viewCtx.focusedTpls()[0] : undefined;
  const component = viewCtx?.currentComponent();
  const envTpl = focusedTpl ?? component?.tplTree;
  // Retain across dock renders while tracking canvas evaluation and selection.
  const data = React.useMemo(
    () =>
      computed(() =>
        viewCtx && viewCtx.renderCount > 0 && envTpl
          ? viewCtx.getCanvasEnvForTpl(envTpl)
          : undefined,
      ),
    [viewCtx, envTpl],
  ).get();
  const onClose = panel.collapse;
  if (!viewCtx || !data) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        className="dimfg"
      >
        Select an artboard to browse its data
      </div>
    );
  }
  return (
    <EscapeScope onEscape={onClose}>
      <DataPicker
        // Reset the browsing path when switching canvas or repeated-item scope.
        key={JSON.stringify([
          viewCtx.arenaFrame().uuid,
          component?.uuid,
          envTpl?.uuid,
          viewCtx.focusedCloneKey(),
        ])}
        value={null}
        onChange={noop}
        onCancel={onClose}
        data={data}
        schema={viewCtx.customFunctionsSchema()}
        docked
        browseOnly
        hideStateSwitch
      />
    </EscapeScope>
  );
});

/** The dock's permanent first tab. It starts collapsed. */
export const dataBrowserTab = {
  id: "data-picker-panel",
  "data-test-id": "data-picker-panel",
  title: "Data",
  icon: <Icon icon={LayersSvgIcon} />,
  content: { kind: "dataBrowser" as const },
};
