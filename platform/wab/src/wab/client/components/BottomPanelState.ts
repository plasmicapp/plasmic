import type { BindingPanelDescriptor } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerPanel";
import type { FormConnectionPanelDescriptor } from "@/wab/client/components/sidebar-tabs/DataSource/ConnectToDBTable";
import type { DataSourcePanelDescriptor } from "@/wab/client/components/sidebar-tabs/DataSource/DataSourceOpPicker";
import type { ServerQueryPanelDescriptor } from "@/wab/client/components/sidebar-tabs/ServerQuery/ServerQueryPanel";

export type BottomPanelContent =
  | { kind: "dataBrowser" }
  | BindingPanelDescriptor
  | DataSourcePanelDescriptor
  | ServerQueryPanelDescriptor
  | FormConnectionPanelDescriptor;

import { PanelStack } from "@/wab/client/components/PanelStack";
import type { BindingPreviewContext } from "@/wab/client/components/editor-sessions/binding-session";
import type { EditableSession } from "@/wab/client/components/editor-sessions/editor-session";
import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { StudioPaneSizes } from "@/wab/client/studio-ctx/StudioPaneSizes";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { comparer, observable, reaction } from "mobx";
import type React from "react";
import tunnel from "tunnel-rat";

export interface BottomPanelTabProps {
  content?: BottomPanelContent;
  /** Breadcrumb title; dockview also uses it to name the panel's aria region. */
  title?: string | (() => string);
  parentId?: string;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  session?: EditableSession;
  /** The view the content is pinned to; the tab closes with it. Else, the focused view. */
  viewCtx?: ViewCtx;
  /** The canvas selection the tab edits; the tab closes when it changes. */
  selection?: BindingPreviewContext;
  /** Accents the dock while this tab is bound to a specific value */
  bound?: boolean;
  "data-test-id"?: string;
}

export interface BottomPanelTabConfig extends BottomPanelTabProps {
  id: string;
  buttonsTunnel: ReturnType<typeof tunnel>;
}

export function tabTitle({ title }: BottomPanelTabProps) {
  return typeof title === "function" ? title() : title;
}

/**
 * Where the panel docks horizontally:
 * - "full": spans the full window width, below the side panes
 * - "centered": fits between the left and right panes, below the canvas only
 * - "auto": centered on wide viewports, full width otherwise
 */
export type BottomPanelAlignment = "auto" | "centered" | "full";

export type BottomPanelSlotId = "center" | "bottom";

function getOpenBaseStack(
  stack: BottomPanelTabConfig[],
  id: string,
  parentId: string | undefined,
) {
  if (!DEVFLAGS.dockview) {
    // Legacy modals are independent; reopening one brings it to the front.
    return stack.filter((entry) => entry.id !== id);
  }
  const existingIndex = stack.findIndex((entry) => entry.id === id);
  const withoutExisting =
    existingIndex >= 0 ? stack.slice(0, existingIndex) : stack;
  const parentIndex = parentId
    ? withoutExisting.findIndex((entry) => entry.id === parentId)
    : -1;
  return parentIndex >= 0
    ? withoutExisting.slice(0, parentIndex + 1)
    : withoutExisting.slice(0, 1);
}

/** The current canvas selection, for a tab that edits something on it. */
export function currentSelection(
  viewCtx: ViewCtx | null | undefined,
): BindingPreviewContext | undefined {
  const tpl = viewCtx?.focusedTpl();
  return viewCtx && tpl
    ? {
        viewCtx,
        component: viewCtx.currentComponent(),
        tpl,
        cloneKey: viewCtx.focusedCloneKey(),
      }
    : undefined;
}

export class BottomPanelState {
  private readonly panels = new PanelStack<BottomPanelTabConfig>();
  private readonly expanded = observable.box(false);
  private readonly focusedBox = observable.box(false);
  /** Moves between alignment slots without remounting editors or dockview. */
  readonly host = (() => {
    const el = document.createElement("div");
    // Let the panel participate in the slot's parent layout.
    el.style.display = "contents";
    return el;
  })();

  constructor(readonly paneSizes = new StudioPaneSizes()) {}

  get stack() {
    return this.panels.stack;
  }
  get isExpanded() {
    return this.expanded.get();
  }
  /** Gates global handlers (e.g. undo/redo) while the user works in a tab. */
  get focused() {
    return this.focusedBox.get();
  }
  set focused(value: boolean) {
    this.focusedBox.set(value);
  }
  get alignment() {
    return this.paneSizes.alignment;
  }
  set alignment(value: BottomPanelAlignment) {
    this.paneSizes.alignment = value;
  }
  get height() {
    return this.paneSizes.height;
  }
  set height(value: number) {
    this.paneSizes.height = value;
  }
  commitHeight(value: number) {
    this.paneSizes.commitHeight(value);
  }
  get activeSlot(): BottomPanelSlotId {
    return this.paneSizes.activeSlot;
  }
  syncViewportWidth() {
    this.paneSizes.syncViewportWidth();
  }

  private navigateAndExpand(
    next: BottomPanelTabConfig[],
    expand: boolean | undefined,
  ) {
    return this.panels.navigate(next).then((opened) => {
      if (opened && expand !== false) {
        this.expand();
      }
      return opened;
    });
  }

  open = (
    id: string,
    props: BottomPanelTabProps,
    options: { expand?: boolean } = {},
  ) => {
    const config: BottomPanelTabConfig = {
      ...props,
      parentId: DEVFLAGS.dockview ? props.parentId : undefined,
      id,
      buttonsTunnel: tunnel(),
    };
    const stack = this.stack;
    const existingIndex = stack.findIndex(
      (entry) => entry.id === id && entry.session,
    );
    const next =
      existingIndex >= 0
        ? DEVFLAGS.dockview
          ? stack.slice(0, existingIndex + 1)
          : [...stack.filter((entry) => entry.id !== id), stack[existingIndex]]
        : [...getOpenBaseStack(stack, id, config.parentId), config];
    return this.navigateAndExpand(next, options.expand);
  };

  activate = (id: string, options: { expand?: boolean } = {}) => {
    const index = this.stack.findIndex((entry) => entry.id === id);
    return index < 0
      ? Promise.resolve(false)
      : this.navigateAndExpand(this.stack.slice(0, index + 1), options.expand);
  };

  saveAndClose = (id: string) => this.panels.leave(id, true);

  close = (id: string) => this.panels.leave(id);

  performAndDiscard = (id: string, action: () => void) =>
    this.panels.performAndDiscard(id, action);

  discard = (id: string) => this.panels.discard(id);

  expand = () => this.expanded.set(true);

  collapse = () => this.expanded.set(false);

  /** Auto-saves and closes tabs whose view, selection or arena went away. */
  watch(studioCtx: StudioCtx) {
    return reaction(
      () => {
        const viewCtx = studioCtx.focusedViewCtx();
        return [
          studioCtx.currentArena,
          viewCtx,
          viewCtx?.focusedTpl() ?? undefined,
          viewCtx?.focusedCloneKey(),
          ...studioCtx.viewCtxs,
        ] as const;
      },
      ([arena, viewCtx, tpl, cloneKey], [previousArena]) => {
        // Choose one navigation: concurrent closes can cancel the arena cleanup.
        if (arena !== previousArena) {
          const root = this.stack[0];
          if (root) {
            void this.activate(root.id, { expand: false });
          }
          return;
        }
        const stale = this.stack.find(
          ({ viewCtx: pinned, selection }) =>
            (pinned && !studioCtx.viewCtxs.includes(pinned)) ||
            (selection &&
              (selection.viewCtx !== viewCtx ||
                selection.tpl !== tpl ||
                selection.cloneKey !== cloneKey)),
        );
        if (stale) {
          void this.close(stale.id);
        }
      },
      { equals: comparer.shallow },
    );
  }
}
