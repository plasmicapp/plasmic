/** @format */
import PageSettings from "@/PageSettings";
import { ImageBackground, mkBackgroundLayer } from "@/wab/bg-styles";
import {
  ArenaFrame,
  ImageAsset,
  isKnownTplComponent,
  isKnownTplTag,
} from "@/wab/classes";
import { CENTERED_FRAME_PADDING } from "@/wab/client/ClientConstants";
import {
  ClipboardAction,
  ClipboardData,
  Clippable,
  FrameClip,
  isFrameClip,
  PLASMIC_CLIPBOARD_FORMAT,
} from "@/wab/client/clipboard";
import { BottomModals } from "@/wab/client/components/BottomModal";
import { CanvasArenaShell } from "@/wab/client/components/canvas/canvas-arena";
import { CanvasCtx } from "@/wab/client/components/canvas/canvas-ctx";
import { CanvasDndOverlay } from "@/wab/client/components/canvas/CanvasDndOverlay";
import { isCanvasOverlay } from "@/wab/client/components/canvas/CanvasFrame";
import { FreestyleBox } from "@/wab/client/components/canvas/FreestyleBox";
import { CloneBoxes } from "@/wab/client/components/canvas/HoverBox/CloneBoxes";
import { HoverBoxes } from "@/wab/client/components/canvas/HoverBox/HoverBoxes";
import { PreselectBox } from "@/wab/client/components/canvas/HoverBox/PreselectBox";
import { PreselectBoxes } from "@/wab/client/components/canvas/HoverBox/PreselectBoxes";
import { MeasureTool } from "@/wab/client/components/canvas/MeasureTool";
import MultiplayerFollowingBorder from "@/wab/client/components/canvas/Multiplayer/MultiplayerFollowingBorder";
import { PlayerBoxes } from "@/wab/client/components/canvas/Multiplayer/PlayerBoxes";
import { PlayerCursors } from "@/wab/client/components/canvas/Multiplayer/PlayerCursors";
import RichTextToolbar from "@/wab/client/components/canvas/RichText/RichTextToolbar";
import { Spotlight } from "@/wab/client/components/canvas/Spotlight";
import { closestTaggedNonTextDomElt } from "@/wab/client/components/canvas/studio-canvas-util";
import { VariantsBar } from "@/wab/client/components/canvas/VariantsBar";
import {
  getMergedTextArg,
  InsertRelLoc,
} from "@/wab/client/components/canvas/view-ops";
import CommentsTab from "@/wab/client/components/comments/CommentsTab";
import { maybeShowContextMenu } from "@/wab/client/components/ContextMenu";
import { DevContainer } from "@/wab/client/components/dev";
import InsertPanelWrapper from "@/wab/client/components/insert-panel/InsertPanelWrapper";
import { PreviewCtx } from "@/wab/client/components/live/PreviewCtx";
import { makeFrameSizeMenu } from "@/wab/client/components/menus/FrameSizeMenu";
import { OmnibarOverlay } from "@/wab/client/components/omnibar/OmnibarOverlay";
import { confirm } from "@/wab/client/components/quick-modals";
import { OldSettingsTab } from "@/wab/client/components/sidebar-tabs/old-settings-tab";
import { SettingsTab } from "@/wab/client/components/sidebar-tabs/SettingsTab";
import {
  ComponentOrPageTab,
  getFocusedComponentFromViewCtxOrArena,
  StyleTab,
  StyleTabContext,
} from "@/wab/client/components/sidebar-tabs/style-tab";
import { CodePreviewPanel } from "@/wab/client/components/studio/code-preview/CodePreviewPanel";
import { FocusedModeToolbar } from "@/wab/client/components/studio/FocusedModeToolbar/FocusedModeToolbar";
import { GlobalCssVariables } from "@/wab/client/components/studio/GlobalCssVariables";
import LeftPane from "@/wab/client/components/studio/LeftPane";
import { TopFrameObserver } from "@/wab/client/components/studio/TopFrameObserver";
import { TopModal } from "@/wab/client/components/studio/TopModal";
import { providesSidebarPopupSetting } from "@/wab/client/components/style-controls/StyleComponent";
import { TopBar } from "@/wab/client/components/top-bar";
import { getContextMenuForFocusedTpl } from "@/wab/client/components/tpl-menu";
import * as widgets from "@/wab/client/components/widgets";
import { BrowserAlertBanner } from "@/wab/client/components/widgets/BrowserAlertBanner";
import { DropdownButton } from "@/wab/client/components/widgets/DropdownButton";
import { AlertBanner } from "@/wab/client/components/widgets/plasmic/AlertBanner";
import { clientToFramePt, frameToClientPt } from "@/wab/client/coords";
import {
  plasmicIFrameMouseDownEvent,
  plasmicIFrameWheelEvent,
} from "@/wab/client/definitions/events";
import { DndAdoptee, DndMarkers, DragMoveManager } from "@/wab/client/Dnd";
import { isArrowKey } from "@/wab/client/dom";
import {
  getElementBounds,
  ImageAssetOpts,
  isCanvasIframeEvent,
  maybeUploadImage,
  readImageFromClipboard,
  ResizableImage,
} from "@/wab/client/dom-utils";
import { reportError } from "@/wab/client/ErrorNotifications";
import {
  denormalizeFigmaData,
  figmaClipIdFromStr,
  figmaDataFromStr,
  tplNodeFromFigmaData,
  uploadFigmaImages,
  uploadNodeImages,
} from "@/wab/client/figma";
import { DragMoveFrameManager } from "@/wab/client/FreestyleManipulator";
import {
  buildCopyStateExtraInfo,
  getCopyState,
  isCopyState,
  postInsertableTemplate,
} from "@/wab/client/insertable-templates";
import { PLATFORM } from "@/wab/client/platform";
import { bindShortcutHandlers } from "@/wab/client/shortcuts/shortcut-handler";
import { shouldHandleStudioShortcut } from "@/wab/client/shortcuts/studio/studio-shortcut-handlers";
import { STUDIO_SHORTCUTS } from "@/wab/client/shortcuts/studio/studio-shortcuts";
import { RightTabKey, StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ViewportCtx } from "@/wab/client/studio-ctx/ViewportCtx";
import { TutorialEventsType } from "@/wab/client/tours/tutorials/tutorials-events";
import { trackEvent } from "@/wab/client/tracking";
import { StandardMarkdown } from "@/wab/client/utils/StandardMarkdown";
import {
  createIframeFromNamedDomSnap,
  DomSnap,
  domSnapIframeToTpl,
  WIElement,
  wiTreeToTpl,
  WI_IMPORTER_HEADER,
} from "@/wab/client/WebImporter";
import {
  assert,
  assertNever,
  ensure,
  ensureArray,
  maybe,
  maybeInstance,
  spawn,
  swallowAsync,
  tuple,
  unexpected,
  withoutNils,
} from "@/wab/common";
import {
  ComponentType,
  isCodeComponent,
  isFrameComponent,
  isPageComponent,
} from "@/wab/components";
import { parseCssNumericNew } from "@/wab/css";
import { dbg } from "@/wab/dbg";
import { DEVFLAGS } from "@/wab/devflags";
import { SceneNode } from "@/wab/figmaTypes";
import { Box, Pt } from "@/wab/geom";
import { mkImageAssetRef } from "@/wab/image-assets";
import {
  FrameViewMode,
  getArenaFrames,
  getFrameHeight,
  isComponentArena,
  isDedicatedArena,
  isMixedArena,
  isPageArena,
  isPositionManagedFrame,
} from "@/wab/shared/Arenas";
import { extractUsedFontsFromComponents } from "@/wab/shared/codegen/fonts";
import { isBaseVariantFrame } from "@/wab/shared/component-arenas";
import {
  GlobalVariantFrame,
  RootComponentVariantFrame,
} from "@/wab/shared/component-frame";
import { cloneCopyState } from "@/wab/shared/insertable-templates";
import { CopyStateExtraInfo } from "@/wab/shared/insertable-templates/types";
import {
  ARENAS_DESCRIPTION,
  ARENA_LOWER,
  FRAME_CAP,
} from "@/wab/shared/Labels";
import { PositionLayoutType } from "@/wab/shared/layoututils";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { WaitForClipError } from "@/wab/shared/UserError";
import { getBaseVariant } from "@/wab/shared/Variants";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import { TplVisibility } from "@/wab/shared/visibility-utils";
import { getSiteArenas } from "@/wab/sites";
import {
  canConvertToSlot,
  canToggleVisibility,
  isTplComponent,
  isTplSlot,
  isTplTextBlock,
  isTplVariantable,
  trackComponentRoot,
} from "@/wab/tpls";
import { ValComponent, ValNode, ValTag } from "@/wab/val-nodes";
import { Alert, notification } from "antd";
import { ArgsProps } from "antd/lib/notification";
import { default as cn, default as cx } from "classnames";
import $ from "jquery";
import L, { throttle } from "lodash";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import React, { createRef } from "react";
import { createPortal } from "react-dom";
import ResizeObserver from "resize-observer-polyfill";
import { SignalBinding } from "signals";

type UIEventBase = JQuery.UIEventBase;

type PastableItem =
  | { type: "clip"; clip: Clippable }
  | {
      type: "figma";
      nodes: Array<SceneNode>;
      uploadedImages: Map<
        string,
        { imageResult: ResizableImage; opts: ImageAssetOpts }
      >;
      nodeImages: Map<
        SceneNode,
        { imageResult: ResizableImage; opts: ImageAssetOpts }
      >;
      imagesToRename: Map<string, string>;
      replaceComponentInstances: boolean;
    }
  | {
      type: "image";
      image: ResizableImage;
      opts: ImageAssetOpts;
      as: "tpl" | "background";
    }
  | { type: "text"; text: string }
  | { type: "presets"; text: string }
  | { type: "domsnap"; snap: DomSnap; iframe: HTMLIFrameElement }
  | { type: "wi-importer"; tree: WIElement }
  | { type: "copy-reference"; extraInfo: CopyStateExtraInfo }
  | undefined;

const minDragPx = 4;
interface DragState {
  initPageX: number;
  initPageY: number;
  initScreenX: number;
  initScreenY: number;
  initClientX: number;
  initClientY: number;
  /** Whether we've passed the min threshold to start dragging. */
  isDragging: boolean;
  dragMoveManager: DragMoveManager | DragMoveFrameManager | undefined;
}

interface ViewEditorProps {
  studioCtx: StudioCtx;
  viewCtx: ViewCtx | undefined;
  previewCtx: PreviewCtx;
}
type ViewEditorState = {};

class ViewEditor_ extends React.Component<ViewEditorProps, ViewEditorState> {
  private canvasClipper = createRef<HTMLDivElement>();
  private canvas = createRef<HTMLDivElement>();
  private canvasScaler = createRef<HTMLDivElement>();
  private onClipperScrollListener: (() => void) | null = null;
  private dragState?: DragState;
  private cursorClientPt?: Pt;
  private measureToolTargets?: {
    targetDom?: JQuery;
    targetPt?: Pt;
    targetVc: ViewCtx;
  };
  private resizeObserver?: ResizeObserver;
  private dndOverlayOpts = observable({
    visible: false,
  });

  private unbindShortcutHandlers: () => void;

  // clipboardAction keeps track of last clipboard action. It is used in
  // "paste as sibling" because Clipboard API only lets us know about the
  // existence of "application/vnd.plasmic.clipboardjson" but does not let
  // us read data from it.
  private clipboardAction: ClipboardAction = "copy";

  constructor(props: ViewEditorProps) {
    super(props);
    dbg.viewEditor = this;
  }

  private viewCtx() {
    return this.props.viewCtx;
  }

  private ensureViewCtx() {
    return ensure(this.viewCtx(), () => "Expected viewCtx to exist");
  }

  private siteOps() {
    return this.props.studioCtx.siteOps();
  }

  private viewOps() {
    return ensure(
      ensure(this.viewCtx(), () => "Expected viewCtx to exist").viewOps,
      () => "Expected viewOps to exist"
    );
  }

  /**
   * If nothing is currently focused, focuses the default frame, and returns
   * true. Else returns false.
   */
  private focusDefaultFrame() {
    if (!this.viewCtx()) {
      spawn(
        this.props.studioCtx.changeUnsafe(() =>
          this.props.studioCtx.focusNextFrame()
        )
      );
      return true;
    }
    return false;
  }

  private listeners: [keyof HTMLElementEventMap, any][] = [];
  private registerListener<K extends keyof HTMLElementEventMap>(
    event: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ) {
    this.listeners.push(tuple(event, listener));
    document.body.addEventListener(event, listener, options);
  }
  private unregisterListeners() {
    for (const [key, listener] of this.listeners) {
      document.body.removeEventListener(key, listener);
    }
    this.listeners.length = 0;
  }

  componentDidMount(): void {
    const canvasClipper = this.canvasClipper.current;
    const canvas = this.canvas.current;
    const canvasScaler = this.canvasScaler.current;
    if (!canvasClipper || !canvas || !canvasScaler) {
      unexpected();
    }

    // Ensure focus on this page, since we are being loaded in an iframe.
    window.focus();

    this.registerListener("pointerdown", (e) =>
      this.handleMouseDown(e, this.viewCtx())
    );
    this.registerListener("pointermove", (e) =>
      this.handleMouseMove(e, this.viewCtx())
    );
    this.registerListener("pointerup", (e) =>
      this.handleMouseUp(e, this.viewCtx())
    );

    // We need to make sure the wheel handler uses {passive: false} so that we
    // can call preventDefault / stopPropagation on it, to prevent the
    // browser from handling the wheel event
    this.registerListener("wheel", this.props.studioCtx.handleCanvasWheel, {
      passive: false,
    });

    this.registerListener("keydown", (e) => {
      if (!this.isFocusedOnCanvas()) {
        return;
      }
      if (this.props.studioCtx.isDevMode) {
        // If spacebar is pressed, prevent default to avoid scrolling.
        // We want to start panning instead.
        if (e.keyCode === 32) {
          e.preventDefault();
        }
        this.props.studioCtx.markKeydown(e.which);
        if (isArrowKey(e.key)) {
          this.props.studioCtx.startUnlogged();
        }
        // Draw MeasureTool guides immediately on Alt
        if (this.props.studioCtx.isAltDown()) {
          this.drawMeasureTool();
        }
      }
    });

    this.registerListener("keyup", (e) => {
      if (!this.isFocusedOnCanvas()) {
        return;
      }
      if (this.props.studioCtx.isDevMode) {
        this.props.studioCtx.markKeyup(e.which);
        if (isArrowKey(e.key)) {
          this.props.studioCtx.stopUnlogged();
        }
        // Remove MeasureTool guides
        if (!this.props.studioCtx.isAltDown()) {
          this.drawMeasureTool();
        }
      }
    });

    this.registerListener("copy", (e: ClipboardEvent) => {
      trackEvent("Copy");
      console.log("Copy event", e);
      this.hotkey(() => {
        if (e.clipboardData) {
          const viewCtx = this.viewCtx();

          if (viewCtx) {
            viewCtx.enforcePastingAsSibling = true;
          }

          const copyObj = this.viewOps().copy();

          if (viewCtx) {
            const copyState = getCopyState(viewCtx, copyObj);
            spawn(
              viewCtx.appCtx.api.whiltelistProjectIdToCopy(copyState.projectId)
            );
            if (copyState.references.length > 0) {
              e.clipboardData.setData(
                PLASMIC_CLIPBOARD_FORMAT,
                JSON.stringify(copyState)
              );
              return;
            }
          }

          e.clipboardData.setData(
            PLASMIC_CLIPBOARD_FORMAT,
            JSON.stringify({ action: "copy" })
          );
          this.clipboardAction = "copy";
        }
      })(e);
    });
    this.registerListener("cut", (e: ClipboardEvent) => {
      trackEvent("Cut");
      console.log("Cut event", e);
      this.hotkey(async () => {
        if (e.clipboardData) {
          await this.viewOps().cut();
          e.clipboardData.setData(
            PLASMIC_CLIPBOARD_FORMAT,
            JSON.stringify({ action: "cut" })
          );
          this.clipboardAction = "cut";
        }
      })(e);
    });
    this.registerListener("paste", async (e) => {
      trackEvent("Paste");
      this.hotkey(async () => {
        if (!e.clipboardData) {
          return;
        }
        const itemToPaste = await this.extractItemToPaste(e.clipboardData);
        if (!itemToPaste) {
          return;
        }
        console.log("Pasting", itemToPaste);
        spawn(
          this.props.studioCtx.changeUnsafe(() => this.pasteItem(itemToPaste))
        );
      }, false)(e);
    });

    const initArena = this.props.studioCtx.currentArena;
    const viewportCtx = new ViewportCtx({
      dom: {
        updateCanvasPadding: (canvasPadding) => {
          canvas.style.padding = `${canvasPadding.y}px ${canvasPadding.x}px`;
        },
        updateArenaSize: (arenaSize) => {
          canvas.style.width = `${arenaSize.x}px`;
          canvas.style.height = `${arenaSize.y}px`;
        },
        scaleTo: (scale, smooth) => {
          canvasScaler.style.transform = `scale(${scale})`;
          canvasScaler.style.transition = smooth
            ? `transform 0.5s, -webkit-transform 0.5s`
            : "";
        },
        scrollTo: (scroll, smooth) => {
          canvasClipper.scrollTo({
            left: scroll.x,
            top: scroll.y,
            behavior: smooth ? "smooth" : "auto",
          });
        },
        scrollBy: (scroll, smooth) => {
          canvasClipper.scrollBy({
            left: scroll.x,
            top: scroll.y,
            behavior: smooth ? "smooth" : "auto",
          });
        },
      },
      initialArena: initArena,
      initialClipperBox: Box.fromRect(canvasClipper.getBoundingClientRect()),
      initialClipperScroll: new Pt(
        canvasClipper.scrollLeft,
        canvasClipper.scrollTop
      ),
    });
    this.props.studioCtx.viewportCtx = viewportCtx;

    if (initArena) {
      const initArenaChildren = getArenaFrames(initArena);
      if (initArenaChildren.length > 0) {
        spawn(
          this.props.studioCtx.changeUnsafe(() => {
            this.props.studioCtx.setStudioFocusOnFrame({
              frame: initArenaChildren[0] as ArenaFrame,
              autoZoom: false,
            });
          })
        );
      }

      this.props.studioCtx.tryZoomToFitArena();
    }

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === canvasClipper) {
          // We want the client box of the clipper, so use getBoundingClientRect().
          // contentRect only provides the size of the box.
          viewportCtx.setClipperBox(
            Box.fromRect(canvasClipper.getBoundingClientRect())
          );
        } else if (entry.target === canvasScaler) {
          // We want the size of the scaler, before CSS transforms, so use contentRect.
          // Note that CSS transforms do not trigger the resize observer.
          viewportCtx.setArenaScalerSize(
            Box.fromRect(entry.contentRect).size()
          );
        }
      }
    });
    this.resizeObserver.observe(canvasClipper);
    this.resizeObserver.observe(canvasScaler);

    this.focusResetListener = this.props.studioCtx.focusReset.add(() => {
      if (this.dragState) {
        this.endDrag();
      }
    });

    this.onClipperScrollListener = () => {
      viewportCtx.setScroll(
        new Pt(canvasClipper.scrollLeft, canvasClipper.scrollTop)
      );
    };
    canvasClipper.addEventListener("scroll", this.onClipperScrollListener);

    const shortcutHandlers = {
      NAV_PARENT: (e: KeyboardEvent) =>
        this.focusDefaultFrame() ||
        this.handleHotkeyIfCanvasFocused(e, async () =>
          this.props.studioCtx.changeUnsafe(() => {
            const parent = this.viewOps().tryNavParent();
            if (!parent) {
              // If we're already at the root, then focus on the containing frame
              this.props.studioCtx.setStudioFocusOnFrame({
                frame: this.ensureViewCtx().arenaFrame(),
                autoZoom: false,
              });
            }
          })
        ),
      NAV_CHILD: (e: KeyboardEvent) =>
        this.focusDefaultFrame() ||
        this.handleHotkeyIfCanvasFocused(e, async () =>
          this.props.studioCtx.changeUnsafe(() => {
            const viewCtx = this.ensureViewCtx();
            if (!viewCtx.focusedSelectable()) {
              // If we're not focused on anything object yet, then start from
              // the root of the current frame
              viewCtx.setStudioFocusByTpl(viewCtx.tplRoot());
            } else {
              const tpl = viewCtx.focusedTpl();
              if (tpl && isTplTextBlock(tpl)) {
                // If tpl is a rich text block, just try to edit it - don't nav
                // to its children.
                this.viewOps().tryEditText();
              } else if (tpl && isTplComponent(tpl) && getMergedTextArg(tpl)) {
                // We're currently selected on a TplComponent with a single visible
                // text arg. Navigating to child should edit that text.
                this.viewOps().tryEditText();
              } else {
                const child = this.viewOps().tryNavChild();
                if (!child) {
                  // Even when tpl is not a rich text block, it may be possible
                  // to edit text, for example, text slot default contents.
                  this.viewOps().tryEditText();
                }
              }
            }
          })
        ),
      NAV_PREV_SIBLING: (e: KeyboardEvent) =>
        this.focusDefaultFrame() ||
        this.handleHotkeyIfCanvasFocused(e, async (e2) =>
          this.props.studioCtx.changeUnsafe(() => {
            if (
              this.props.studioCtx.focusedFrame() ||
              this.viewOps().isFocusedOnRootOfStretchFrame()
            ) {
              this.props.studioCtx.focusPrevFrame();
            } else {
              const prev = this.viewOps().tryNavPrev();
              if (!prev) {
                // If we're at the start, then go to parent
                shortcutHandlers.NAV_PARENT(e2);
              }
            }
          })
        ),
      NAV_NEXT_SIBLING: (e: KeyboardEvent) =>
        this.focusDefaultFrame() ||
        this.handleHotkeyIfCanvasFocused(e, async (e2) =>
          this.props.studioCtx.changeUnsafe(() => {
            if (
              this.props.studioCtx.focusedFrame() ||
              this.viewOps().isFocusedOnRootOfStretchFrame()
            ) {
              this.props.studioCtx.focusNextFrame();
            } else {
              const next = this.viewOps().tryNavNext();
              if (!next) {
                // If we're at the end, then go to parent
                shortcutHandlers.NAV_PARENT(e2);
              }
            }
          })
        ),
      DELETE: (e: KeyboardEvent) => this.handleDelete(e, { forceDelete: true }),
      HIDE: (e: KeyboardEvent) => this.handleDelete(e, { forceDelete: false }),
      ENTER_EDIT: (e: KeyboardEvent) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() => {
            const vc = this.ensureViewCtx();
            const focusObj = vc.focusedSelectable();
            if (!focusObj) {
              return;
            }
            if (focusObj instanceof ValComponent && focusObj.tpl) {
              const codeComponent = isCodeComponent(focusObj.tpl.component);
              const ownedBySite = vc
                .tplMgr()
                .isOwnedBySite(focusObj.tpl.component);
              if (
                ownedBySite &&
                this.props.studioCtx.canEditComponent(focusObj.tpl.component) &&
                !codeComponent
              ) {
                // This is a ValComponent mapping to a Plasmic component, so enter
                // Master component edit mode
                vc.enterComponentCtxForVal(focusObj, "ctrl+enter");
              } else {
                notification.warning({
                  message: `You cannot edit ${
                    codeComponent
                      ? "a code"
                      : ownedBySite
                      ? "this"
                      : "an imported"
                  } component.`,
                });
              }
            } else {
              vc.getViewOps().tryEditText();
            }
          })
        ),
      GO_TO_COMPONENT_ARENA: (e: KeyboardEvent) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() => {
            const vc = this.ensureViewCtx();
            const focusObj = vc.focusedSelectable();

            if (focusObj) {
              vc.studioCtx.switchToComponentArena(focusObj);
            }
          })
        ),
      ENTER_EDIT_FRAME: (e: KeyboardEvent) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() => {
            const vc = this.ensureViewCtx();
            const focusObj = vc.focusedSelectable();
            if (!focusObj) {
              return;
            }
            const arena = vc.studioCtx.currentArena;
            if (!isMixedArena(arena)) {
              return;
            }
            if (focusObj instanceof ValComponent && focusObj.tpl) {
              const tplComponent = focusObj.tpl.component;
              const codeComponent = isCodeComponent(tplComponent);
              const ownedBySite = vc.tplMgr().isOwnedBySite(tplComponent);
              if (
                !codeComponent &&
                ownedBySite &&
                this.props.studioCtx.canEditComponent(tplComponent)
              ) {
                vc.studioCtx
                  .siteOps()
                  .createNewFrameForMixedArena(tplComponent, {});
              } else {
                notification.warning({
                  message: `You cannot edit ${
                    codeComponent
                      ? "a code"
                      : ownedBySite
                      ? "this"
                      : "an imported"
                  } component.`,
                });
              }
            }
          })
        ),
      MOVE_LEFT: (e: KeyboardEvent) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() => this.viewOps().moveBackward())
        ),
      MOVE_RIGHT: (e: KeyboardEvent) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() => this.viewOps().moveForward())
        ),
      MOVE_HOME: (e: KeyboardEvent) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() => this.viewOps().moveStart())
        ),
      MOVE_END: (e: KeyboardEvent) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() => this.viewOps().moveEnd())
        ),
      WRAP_HSTACK: (e: KeyboardEvent) =>
        this.handleHotkey(e, async () => {
          if (this.ensureViewCtx().focusedTpl()) {
            await this.viewOps().wrapInContainer("flex-row");
          }
        }),
      WRAP_VSTACK: (e: KeyboardEvent) =>
        this.handleHotkey(e, async () => {
          if (this.ensureViewCtx().focusedTpl()) {
            await this.viewOps().wrapInContainer("flex-column");
          }
        }),
      TOGGLE_VISIBILITY: (e: KeyboardEvent) => {
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() => {
            const viewOps = this.viewOps();
            const focusedTpl = this.ensureViewCtx().focusedTpl();

            if (focusedTpl && canToggleVisibility(focusedTpl)) {
              const currentVisibility =
                viewOps.getEffectiveTplVisibility(focusedTpl);
              if (currentVisibility === TplVisibility.Visible) {
                viewOps.setTplVisibility(
                  focusedTpl,
                  isTplSlot(focusedTpl)
                    ? TplVisibility.NotRendered
                    : TplVisibility.DisplayNone
                );
              } else {
                viewOps.setTplVisibility(focusedTpl, TplVisibility.Visible);
              }
            }
          })
        );
      },
      NUDGE_LEFT: (e) => {
        if (!this.props.studioCtx.isLiveMode) {
          this.handleHotkey(e, async (e2) =>
            this.props.studioCtx.changeUnsafe(() =>
              this.viewOps().nudgePosition("left", e2.shiftKey)
            )
          );
        }
      },
      NUDGE_RIGHT: (e) => {
        if (!this.props.studioCtx.isLiveMode) {
          this.handleHotkey(e, async (e2) =>
            this.props.studioCtx.changeUnsafe(() =>
              this.viewOps().nudgePosition("right", e2.shiftKey)
            )
          );
        }
      },
      NUDGE_UP: (e) =>
        this.handleHotkey(e, async (e2) =>
          this.props.studioCtx.changeUnsafe(() =>
            this.viewOps().nudgePosition("up", e2.shiftKey)
          )
        ),
      NUDGE_DOWN: (e) =>
        this.handleHotkey(e, async (e2) =>
          this.props.studioCtx.changeUnsafe(() =>
            this.viewOps().nudgePosition("down", e2.shiftKey)
          )
        ),
      GROW_WIDTH: (e) =>
        this.handleHotkey(e, async (e2) =>
          this.props.studioCtx.changeUnsafe(() =>
            this.viewOps().nudgeSize("width", true, e2.shiftKey)
          )
        ),
      SHRINK_WIDTH: (e) =>
        this.handleHotkey(e, async (e2) =>
          this.props.studioCtx.changeUnsafe(() =>
            this.viewOps().nudgeSize("width", false, e2.shiftKey)
          )
        ),
      GROW_HEIGHT: (e) =>
        this.handleHotkey(e, async (e2) =>
          this.props.studioCtx.changeUnsafe(() =>
            this.viewOps().nudgeSize("height", true, e2.shiftKey)
          )
        ),
      SHRINK_HEIGHT: (e) =>
        this.handleHotkey(e, async (e2) =>
          this.props.studioCtx.changeUnsafe(() =>
            this.viewOps().nudgeSize("height", false, e2.shiftKey)
          )
        ),
      TOGGLE_AUTOLAYOUT: (e: KeyboardEvent) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() =>
            this.viewOps().toggleAutoLayout()
          )
        ),
      TOGGLE_HSTACK: (e: KeyboardEvent) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() =>
            this.viewOps().setHstackLayout()
          )
        ),
      TOGGLE_VSTACK: (e: KeyboardEvent) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() =>
            this.viewOps().setVstackLayout()
          )
        ),
      AUTOSIZE: (e: KeyboardEvent) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() =>
            this.viewOps().autoSizeFocused()
          )
        ),
      DUPLICATE: (e) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() => this.viewOps().duplicate())
        ),
      EXTRACT_COMPONENT: (e) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() => {
            const vc = this.viewCtx();
            if (vc) {
              const tpl = vc.focusedTpl();
              const component = vc.arenaFrame().container.component;
              if (tpl) {
                if (
                  isFrameComponent(component) &&
                  vc.getViewOps().isRootNodeOfFrame(tpl)
                ) {
                  spawn(this.viewOps().convertFrameToComponent());
                } else {
                  spawn(this.viewOps().extractComponent());
                }
              } else if (
                this.props.studioCtx.focusedFrame() === vc.arenaFrame() &&
                isFrameComponent(component)
              ) {
                spawn(this.viewOps().convertFrameToComponent());
              }
            }
          })
        ),
      CONVERT_SLOT: (e) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() => {
            const tpl = this.ensureViewCtx().focusedTpl();
            if (tpl && canConvertToSlot(tpl)) {
              this.viewOps().convertToSlot(tpl);
            }
          })
        ),
      COPY_ELEMENT_STYLE: (e) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() => this.viewOps().copyStyle())
        ),
      PASTE_ELEMENT_STYLE: (e) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() =>
            this.viewOps().tryPasteStyleFromClipboard()
          )
        ),
      PASTE_AS_SIBLING: (e: KeyboardEvent) =>
        this.handleHotkey(e, async () => this.tryPasteAsSibling()),
      BOLD: (e) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() => this.viewOps().toggleBold())
        ),
      DECREASE_FONT_SIZE: (e) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() =>
            this.viewOps().updateFontSize(-1)
          )
        ),
      INCREASE_FONT_SIZE: (e) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() =>
            this.viewOps().updateFontSize(1)
          )
        ),
      DECREASE_FONT_WEIGHT: (e) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() =>
            this.viewOps().updateFontWeight(-1)
          )
        ),
      INCREASE_FONT_WEIGHT: (e) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() =>
            this.viewOps().updateFontWeight(1)
          )
        ),
      CONVERT_LINK: (e) =>
        this.handleHotkey(e, async () =>
          this.props.studioCtx.changeUnsafe(() => {
            this.viewOps().convertToLink();
          })
        ),
      // WRAP: e => this.handleHotkey(e, async () => this.viewOps().wrap())
    };
    this.unbindShortcutHandlers = bindShortcutHandlers(
      document.body,
      STUDIO_SHORTCUTS,
      shortcutHandlers,
      shouldHandleStudioShortcut(this.props.studioCtx)
    );
  }

  componentWillUnmount() {
    const canvasClipper = this.canvasClipper.current;
    const canvas = this.canvas.current;
    const canvasScaler = this.canvasScaler.current;
    if (!canvasClipper || !canvas || !canvasScaler) {
      unexpected();
    }

    this.unbindShortcutHandlers();
    this.unregisterListeners();

    if (this.resizeObserver) {
      this.resizeObserver.unobserve(canvasClipper);
      this.resizeObserver.unobserve(canvasScaler);
    }
    if (this.focusResetListener) {
      this.focusResetListener.detach();
      this.focusResetListener = undefined;
    }

    if (this.onClipperScrollListener) {
      canvasClipper.removeEventListener("scroll", this.onClipperScrollListener);
      this.onClipperScrollListener = null;
    }

    this.props.studioCtx.viewportCtx?.dispose();
    this.props.studioCtx.viewportCtx = null;
  }

  focusResetListener: SignalBinding | undefined = undefined;

  private isFocusedOnCanvas() {
    return (
      document.activeElement === document.body &&
      !this.props.studioCtx.isBottomModalFocused()
    );
  }

  private hotkey = (f: (e: UIEventBase) => any, requireViewCtx = true) => {
    return (e) => {
      if (requireViewCtx && !this.viewCtx()) {
        return;
      }
      if (this.viewCtx() && this.viewOps().isEditing()) {
        return;
      }
      // We don't handle hotkeys (copy|cut|paste) if we are in the DocsPortal
      if (window.location.pathname.includes("docs")) {
        return;
      }
      if (this.props.studioCtx.isDevMode && this.isFocusedOnCanvas()) {
        e.preventDefault();
        return f(e);
      }
    };
  };

  private handleHotkey(
    e: KeyboardEvent,
    f: (e: KeyboardEvent) => Promise<void>
  ) {
    if (this.shouldHandleHotkey(e)) {
      spawn(f(e));
      return true;
    } else {
      return false;
    }
  }

  /**
   * Used for tab, shift+tab, enter, shift+enter keyboard shortcuts.
   * Since these shortcuts have browser defaults, we only run these
   * when focused on the canvas (i.e. not bubbled up from an inner element).
   */
  private handleHotkeyIfCanvasFocused(
    e: KeyboardEvent,
    f: (e: KeyboardEvent) => Promise<void>
  ) {
    if (!this.isFocusedOnCanvas()) {
      return false;
    }

    return this.handleHotkey(e, f);
  }

  private shouldHandleHotkey(_e: KeyboardEvent) {
    return (
      this.viewCtx() &&
      !this.viewOps().isEditing() &&
      this.props.studioCtx.isDevMode
    );
  }

  async tryPasteAsSibling() {
    const sc = this.props.studioCtx;
    const data = new ClipboardData();

    try {
      const clipboardData = await sc.appCtx.api.readNavigatorClipboard(
        this.clipboardAction
      );
      await data.setParsedData(sc.appCtx, clipboardData);
    } catch (e) {
      console.error(e);

      // If unable to read data from the clipboard, assume that it
      // contains a paste from Plasmic.
      await data.setParsedData(sc.appCtx, {
        map: {
          [PLASMIC_CLIPBOARD_FORMAT]: JSON.stringify({
            action: this.clipboardAction,
          }),
        },
      });
    }

    const itemToPaste = await this.extractItemToPaste(data);
    if (itemToPaste) {
      await this.props.studioCtx.changeUnsafe(() => {
        this.pasteItem(itemToPaste, "sibling");
      });
    }
  }

  pasteItem(itemToPaste: PastableItem, as?: "child" | "sibling") {
    const vc = this.viewCtx();

    // If "as" is not specified, we check if we should enforce pasting as sibling
    as = as ?? vc?.enforcePastingAsSibling ? "sibling" : "child";

    // After pasting (and selecting the new node),
    // we always enforce next pasting to be as sibling
    // so the user can paste multiple times.
    // We stop enforcing that when they intentionally change selection.
    L.defer(() => {
      if (vc) {
        vc.enforcePastingAsSibling = true;
      }
    });

    if (!itemToPaste) {
      return;
    }

    const sc = this.props.studioCtx;

    // Item to paste: Frame clip.
    if (itemToPaste.type === "clip" && isFrameClip(itemToPaste.clip)) {
      sc.siteOps().pasteFrameClip(itemToPaste.clip as FrameClip);
      return;
    }

    let relLoc: InsertRelLoc | undefined;
    if (as === "sibling") {
      relLoc = InsertRelLoc.after;
    }

    if (itemToPaste.type === "figma") {
      pasteFromFigma(vc, sc, itemToPaste, relLoc, this.cursorClientPt);
      return;
    }

    if (!vc) {
      notification.error({
        message: "Cannot paste item",
        description: `You must have an ${FRAME_CAP} in focus in order to paste.`,
      });
      return;
    }
    // Item to paste: Non-frame clip.
    if (itemToPaste.type === "clip") {
      vc.getViewOps().pasteClip({
        clip: itemToPaste.clip,
        cursorClientPt: this.cursorClientPt,
        target: undefined,
        loc: relLoc,
      });
      return;
    }

    const vtm = vc.variantTplMgr();

    // Item to paste: Text.
    if (itemToPaste.type === "text") {
      const node = vtm.mkTplInlinedText(itemToPaste.text);
      vc.getViewOps().pasteNode(node, this.cursorClientPt, undefined, relLoc);
      return;
    }

    // Item to paste: Presets.
    if (itemToPaste.type === "presets") {
      // vc.getViewOps().pastePresets(itemToPaste.text);
      return;
    }

    // Item to paste: Image.
    if (itemToPaste.type === "image") {
      const asset = sc
        .siteOps()
        .createImageAsset(itemToPaste.image, itemToPaste.opts);
      if (asset) {
        if (itemToPaste.as === "background") {
          vc.getViewOps().pasteClip({
            clip: {
              type: "style",
              cssProps: makeBackgroundImageProps(asset.asset),
            },
            cursorClientPt: this.cursorClientPt,
          });
        } else {
          const node = vtm.mkTplImage({
            asset: asset.asset,
            iconColor: asset.iconColor,
          });
          vc.getViewOps().pasteNode(
            node,
            this.cursorClientPt,
            undefined,
            relLoc
          );
        }
      }
      return;
    }

    if (itemToPaste.type === "domsnap") {
      const { iframe, snap } = itemToPaste;
      try {
        const tpl = domSnapIframeToTpl(
          snap,
          iframe,
          vc.variantTplMgr(),
          this.siteOps(),
          vc.appCtx
        );
        vc.getViewOps().pasteNode(tpl);
      } finally {
        iframe.remove();
      }
      return;
    }

    if (itemToPaste.type === "wi-importer") {
      const tpl = wiTreeToTpl(
        itemToPaste.tree,
        vc,
        vc.variantTplMgr(),
        this.siteOps(),
        vc.appCtx
      );

      if (tpl) {
        vc.getViewOps().pasteNode(tpl);
      }
      return;
    }

    if (itemToPaste.type === "copy-reference") {
      const currentComponent = vc.currentComponent();

      try {
        const { nodesToPaste, seenFonts } = cloneCopyState(
          vc.studioCtx.site,
          itemToPaste.extraInfo,
          getBaseVariant(currentComponent),
          vc.studioCtx.getPlumeSite(),
          currentComponent,
          vc.viewOps.adaptTplNodeForPaste
        );

        if (nodesToPaste.length > 0) {
          // `cloneCopyState` only handles a single node for now
          vc.getViewOps().pasteNode(nodesToPaste[0]);
          postInsertableTemplate(vc.studioCtx, seenFonts);
          // Infer that only the design has been pasted as content
          // related to data or dynamic binding have been striped
          notification.success({
            message: "Elements pasted",
            description: "Designs have been successfully pasted.",
          });
        }
      } catch (err) {
        notification.error({
          message: "Cannot paste elements",
          description: <StandardMarkdown>{err.message}</StandardMarkdown>,
        });
      }

      return;
    }

    assertNever(itemToPaste);
  }

  /**
   * Returns a variety of things that could be pasted from the clipboard, or
   * undefined if nothing can be pasted.  Note that this method is called
   * outside of studioCtx.change(), so do not make any changes to the
   * data model from here.
   */
  private async extractItemToPaste(
    clipboardData: DataTransfer | ClipboardData
  ): Promise<PastableItem> {
    const sc = this.props.studioCtx;
    const plasmicDataStr = clipboardData.getData(PLASMIC_CLIPBOARD_FORMAT);
    const viewCtx = this.viewCtx();
    if (viewCtx && DEVFLAGS.pasteSnap) {
      const { iframe, snap } = await createIframeFromNamedDomSnap(
        DEVFLAGS.pasteSnap
      );
      return {
        type: "domsnap",
        snap: snap,
        iframe: iframe,
      };
    }
    if (plasmicDataStr) {
      const plasmicData = JSON.parse(plasmicDataStr);
      // We've 2 different behavior when performing a copy/paste:
      //
      // - Copy/paste inside the project
      // This has a different handling because it allows to do more direct surgery in the tree
      // which will be pasted, as we can reference existing content more easily, but this actually
      // can be troublesome inside the own project if it involves different branches or versions
      //
      // - Copy/paste cross projects
      // This is a more limited copy/paste as in many cases some references will be removed, as
      // an example, global variants, data source exprs, page references, state references,
      // which we can't be sure to perform an attachment in between projects.

      function shouldPerformCrossTabCopy() {
        if (!isCopyState(plasmicData)) {
          return false;
        }
        // If we are dealing with a different project, then we can only
        // perform a cross-tab copy
        if (plasmicData.projectId !== sc.siteInfo.id) {
          return true;
        }
        // We are in the same project, dealing with different branches
        // perform a cross-tab copy, since we are not sure about references
        if (plasmicData.branchId !== sc.dbCtx().branchInfo?.id) {
          return true;
        }
        // We are dealing with the same project and branch, but an older version
        // perform a cross-tab copy, since we are not sure about references
        if (plasmicData.bundleRef.type === "pkg") {
          return true;
        }
        // It may be the case that we are dealing with a different revisionNum here
        // but we will assume it's fine, considering the expected time for user to copy/paste
        return false;
      }

      if (shouldPerformCrossTabCopy()) {
        try {
          const extraInfo = await buildCopyStateExtraInfo(sc, plasmicData);
          return {
            type: "copy-reference",
            extraInfo,
          };
        } catch (err) {
          reportError(err);
          notification.error({
            message: "Cannot paste elements",
            description: err.message,
          });
          return undefined;
        }
      } else if (
        sc.clipboard.isSet() &&
        ["copy", "cut", "cross-tab-copy"].includes(plasmicData.action)
      ) {
        console.log("Pasting plasmic-clipboard tpl");
        return { type: "clip", clip: sc.clipboard.paste() };
      }
    } else {
      // Figma paste check needs to come before the image check, as it contains
      // SVG data and will return a false positive from `readImageFromClipboard`
      const textContent = clipboardData.getData("text/plain");
      if (textContent) {
        const figmaPasteInput = await sc.app.withSpinner(
          (async () => {
            const getFigmaData = async () => {
              const figmaData = figmaDataFromStr(textContent);
              if (figmaData) {
                return figmaData;
              }

              const clipId = figmaClipIdFromStr(textContent);
              if (!clipId) {
                return undefined;
              }

              const getClipResponse = await swallowAsync(
                sc.appCtx.api.getClip(clipId)
              );
              if (!getClipResponse) {
                throw new WaitForClipError();
              }

              const { content: clipContent } = getClipResponse;
              return figmaDataFromStr(clipContent);
            };
            const figmaData = await getFigmaData();
            if (!figmaData) {
              return undefined;
            }
            console.log("Pasting figma layers");
            const uploadedImages = await uploadFigmaImages(
              figmaData,
              sc.appCtx
            );
            const { nodes, imagesToRename } = denormalizeFigmaData(figmaData);
            const nodeImages = await uploadNodeImages(nodes, sc.appCtx);

            return {
              type: "figma" as const,
              nodes,
              uploadedImages,
              nodeImages,
              imagesToRename,
            };
          })()
        );
        if (figmaPasteInput) {
          const replaceComponentInstances = !!(await confirm({
            message: (
              <>
                <p>
                  Figma components instances can be converted into existing
                  components of the same name, in your Plasmic project,
                  including code components. If there's no component of the same
                  name, it will be converted into basic elements.
                </p>
                <p>Try converting Figma components to Plasmic components?</p>
                <a
                  href="https://docs.plasmic.app/learn/importing-from-figma/#converting-component-instances"
                  target="_blank"
                >
                  {"Learn more."}
                </a>
              </>
            ),
            confirmLabel: "Yes, use existing Plasmic components",
            cancelLabel: "No, use basic elements",
          }));
          return { replaceComponentInstances, ...figmaPasteInput };
        }
      }

      if (textContent.startsWith(WI_IMPORTER_HEADER)) {
        return {
          type: "wi-importer",
          tree: JSON.parse(textContent.substring(WI_IMPORTER_HEADER.length)),
        };
      }

      const presetsHeader = "__wab_plasmic_presets;";
      if (textContent.startsWith(presetsHeader)) {
        return {
          type: "presets",
          text: textContent.substr(presetsHeader.length),
        };
      }

      /**
       * Something weird happens across the iframe boundary,
       * we lose type information!
       * Even when clipboardData is clearly a DataTransfer:
       * - `clipboardData instanceof DataTransfer` returns false
       * - `typeof clipboardData` returns "object";
       * So here, we check for ClipboardData instead
       **/
      const image =
        clipboardData instanceof ClipboardData
          ? clipboardData.getImage()
          : await readImageFromClipboard(sc.appCtx, clipboardData);

      if (image) {
        return await sc.app.withSpinner(
          (async () => {
            const { imageResult, opts } = await maybeUploadImage(
              this.props.studioCtx.appCtx,
              image,
              undefined,
              undefined
            );
            return {
              type: "image" as const,
              as: "tpl" as const, // For now, we only support pasting as tpl
              image: ensure(
                imageResult,
                () => "Expected imageResult to be not null"
              ),
              opts: ensure(opts, () => "Expected opts to be not null"),
            };
          })()
        );
      }

      if (textContent) {
        // TODO: work with rich text as well
        console.log("Pasting plain content", textContent);
        return { type: "text", text: textContent };
      }
    }

    notification.warn({
      message: "Nothing to paste - the clipboard is empty",
    });
    return undefined;
  }

  /**
   * The dragenter and dragleave events fire on entering/leaving nested elements
   * in a DOM tree, so we count how deep we are in a nested tree to track
   * whether we're actually entered or exited from the overall tree.
   */
  private dragDepth = 0;

  /**
   * We must call preventDefault to signify a valid drop target.
   */
  private handleDragEnter(e: DragEvent | React.DragEvent<HTMLDivElement>) {
    if (this.props.studioCtx.isInteractiveMode) {
      return;
    }
    e.preventDefault();
    this.dragDepth++;
    if (!this.dndOverlayOpts.visible) {
      this.dndOverlayOpts.visible = true;
    }
  }

  private handleDragLeave(e: DragEvent | React.DragEvent<HTMLDivElement>) {
    if (this.props.studioCtx.isInteractiveMode) {
      return;
    }
    e.preventDefault();
    this.dragDepth--;
    if (this.dndOverlayOpts.visible && this.dragDepth === 0) {
      this.dndOverlayOpts.visible = false;
    }
  }

  private updateCursorLocation(
    e: MouseEvent | React.MouseEvent<HTMLDivElement> | null,
    vc?: ViewCtx
  ) {
    let data: { left: number; top: number } | null = null;
    if (e) {
      let clientPt = new Pt(e.pageX, e.pageY);
      if (vc) {
        clientPt = frameToClientPt(clientPt, vc);
      }
      const pt = this.props.studioCtx.viewportCtx!.clientToScaler(clientPt);
      data = {
        left: pt.x,
        top: pt.y,
      };
    }
    this.props.studioCtx.updateCursorLocation(data);
  }

  private async handleDrop(e: DragEvent | React.DragEvent<HTMLDivElement>) {
    if (this.props.studioCtx.isInteractiveMode) {
      return;
    }
    e.preventDefault();
    this.dndOverlayOpts.visible = false;
    this.dragDepth = 0;
    if (!e.dataTransfer) {
      return;
    }
    const itemToPaste = await this.extractItemToPaste(e.dataTransfer);
    console.log("Drag-n-drop", itemToPaste);
    spawn(this.props.studioCtx.changeUnsafe(() => this.pasteItem(itemToPaste)));
  }

  private async handleMouseDown(
    e: MouseEvent,
    focusedVc: ViewCtx | undefined | null
  ) {
    if (
      this.props.studioCtx.isLiveMode ||
      this.props.studioCtx.isInteractiveMode
    ) {
      return;
    }

    // ignore the events if we are in freestyle mode
    if (this.props.studioCtx.freestyleState()) {
      return;
    }

    // Dispatch Plasmic events if the original event happened inside an iframe
    if (isCanvasIframeEvent(e)) {
      this.props.studioCtx.setWatchPlayerId(null);
      document.dispatchEvent(new Event(plasmicIFrameMouseDownEvent));
    }

    // Panning has a higher precedence than anything else.
    if (e.button === 1 || this.props.studioCtx.isSpaceDown()) {
      if (getArenaFrames(this.props.studioCtx.currentArena).length) {
        this.props.studioCtx.startPanning(e);
      }
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const isMacContextMenu = PLATFORM == "osx" && e.button === 0 && e.ctrlKey;
    if (e.button !== 0 || isMacContextMenu) {
      if (e.button === 2 || isMacContextMenu) {
        // right click in the frame. preventDefault so that input doesn't
        // receive focus.
        if ((e.target as HTMLElement).ownerDocument.defaultView !== window) {
          e.preventDefault();
        }
      }
      return;
    }

    if (this.props.studioCtx.dragInsertState()) {
      const dragState = this.props.studioCtx.dragInsertState();
      const manager = dragState?.dragMgr;
      const vc = manager?.tentativeVc;
      const extraInfo = dragState?.spec.asyncExtraInfo
        ? await dragState?.spec.asyncExtraInfo(this.props.studioCtx)
        : undefined;
      if (extraInfo === false) {
        return;
      }
      spawn(
        this.props.studioCtx.changeUnsafe(() => {
          if (vc) {
            dragState?.dragMgr.endDrag(dragState?.spec, extraInfo);
          }
          this.props.studioCtx.setDragInsertState(undefined);
        })
      );
      return;
    }

    const r = this.extractEventTarget(e, focusedVc);
    if (!r) {
      return;
    }
    const [$target, targetVc] = r;

    if (!targetVc) {
      // Make sure that the onBlur events are called before resetting
      // the focus.
      maybeInstance(document.activeElement, HTMLElement, (ae) => ae.blur());
      spawn(
        this.props.studioCtx.changeUnsafe(() => {
          // A click that visually outside the frame. Clear focus
          this.props.studioCtx.setStudioFocusOnFrame({
            frame: undefined,
            autoZoom: false,
          });
        })
      );
      return;
    }

    // Next, we treat the mouse click as potentially selecting something on
    // the canvas.  We only do so if what we clicked on is not an element that
    // we're currently editing the text of, because in that case, we want the
    // click to work as usual within the text editor
    if (targetVc.getViewOps().isEditing(e.target as HTMLElement)) {
      return;
    }

    // We're handling the event
    e.preventDefault();
    e.stopPropagation();
    // If the user's app components install document listeners, we try to stop them from firing. For example, prevent triggering listeners from overlays/modals that dismiss on clicking outside.
    e.stopImmediatePropagation();

    // If we're clicking to select, we bring the focus back to the document
    // body (blurring any form elements that may have focus in the style panel)
    // This makes sure that the onBlur events of those form elements are called
    // before we switch our selection.
    maybeInstance(document.activeElement, HTMLElement, (ae) => ae.blur());

    const makeSpeculativeDragState = () => ({
      initPageX: e.pageX,
      initPageY: e.pageY,
      initScreenX: e.screenX,
      initScreenY: e.screenY,
      initClientX: e.clientX,
      initClientY: e.clientY,
      isDragging: false,
      dragMoveManager: undefined,
    });

    const internalElements = targetVc.canvasCtx.$wabInternalElements();
    if (internalElements.find((elm) => $target.is(elm))) {
      // Clicked on the empty space between root and frame
      targetVc.change(() => {
        targetVc.setStudioFocusByTpl(null);
        targetVc.canvasCtx.clearRange();
        targetVc.studioCtx.setStudioFocusOnFrame({
          frame: targetVc.arenaFrame(),
          autoZoom: false,
        });
      });
      // We allow potentially dragging the frame by using this empty space
      this.dragState = makeSpeculativeDragState();
      return;
    }

    const closest = closestTaggedNonTextDomElt($target, targetVc, {
      excludeNonSelectable: true,
    });

    if (closest == null) {
      notification.warn({
        message: "Unknown element",
        description: (
          <span>
            Plasmic cannot determine which layer the the clicked element belongs
            to. This happens typically on code component where Plasmic doesn't
            know the structure of the DOM in the component. <br />
            <br />
            Please select nodes from the tree in the left panel.
          </span>
        ),
      });
      targetVc.change(() => {
        targetVc.setStudioFocusByTpl(null);
        targetVc.canvasCtx.clearRange();
      });
      return;
    }

    const focusedSelectables = targetVc.focusedSelectables();
    const focusable = targetVc.getViewOps().getFinalFocusable(closest).val;

    if (!focusable || !focusedSelectables.includes(focusable)) {
      const focusedSelectable = targetVc.getViewOps().tryFocusDomElt(closest, {
        appendToMultiSelection: e.shiftKey,
        exact: false,
      });

      if (PLATFORM === "osx" ? e.metaKey : e.ctrlKey) {
        if (e.altKey) {
          targetVc.change(() => {
            targetVc.studioCtx.switchToComponentArena(focusedSelectable);
          });
        } else {
          targetVc.getViewOps().deepFocusElement(closest, "ctrl-click");
        }
      }
    }

    this.dragState = makeSpeculativeDragState();
  }

  private throttledWarn = throttle(
    (args: ArgsProps) => notification.warn(args),
    5000,
    {
      trailing: false,
    }
  );

  private async handleMouseMove(e: MouseEvent, vc: ViewCtx | undefined | null) {
    if (
      this.props.studioCtx.isLiveMode ||
      this.props.studioCtx.isInteractiveMode
    ) {
      return;
    }
    // Sometimes, especially in debug mode, your ctrl/meta key up event may be
    // lost due to focused in debug panel. Here we update the key status.
    this.props.studioCtx.tryUpdateKeyboardStatus(e);
    if (this.props.studioCtx.tryPanning(e)) {
      return;
    }

    if (this.dndOverlayOpts.visible) {
      // Sometimes dropping over the canvas gets stuck.  But we know that while dragging,
      // mouse events are not fired; so if we detect mouse move events, then we
      // cancel the canvas-drop overlay
      this.dndOverlayOpts.visible = false;
      this.dragDepth = 0;
    }

    // Record where the mouse is
    const $target = $(e.target as HTMLElement);
    const isOverFrame =
      $target.parents().is(".__wab_user-body") ||
      $target.is(".__wab_user-body") ||
      isCanvasOverlay($target);
    if (isOverFrame) {
      this.updateCursorLocation(
        e,
        ensure(vc, () => "Expected vc to exist")
      );
    }
    const clientPt = isOverFrame
      ? frameToClientPt(
          new Pt(e.pageX, e.pageY),
          ensure(vc, () => "Expected vc to exist")
        )
      : new Pt(e.clientX, e.clientY);
    this.cursorClientPt = clientPt;

    if (this.props.studioCtx.dragInsertState()) {
      await this.props.studioCtx.changeUnsafe(() => {
        const manager = ensure(
          this.props.studioCtx.dragInsertState()?.dragMgr,
          "dragMgr should exist on dragInsertState."
        );
        if (
          !Box.fromRect(
            this.props.studioCtx.canvasClipper().getBoundingClientRect()
          ).contains(new Pt(e.clientX, e.clientY))
        ) {
          manager.clear();
        } else {
          manager.drag(new Pt(e.pageX, e.pageY), e);
        }
      });
      return;
    }

    const s = this.dragState;
    if (!s) {
      // handle mouse hover
      this.genericHandleMouseOver(e, vc);
      return;
    }

    if (!vc || this.props.studioCtx.isLiveMode) {
      return;
    }
    // ignore the events if we are in freestyle mode
    if (this.props.studioCtx.freestyleState()) {
      return;
    }

    // HoverBox (which pokes every 200ms) may not hide itself fast
    // enough so mousemove may be over the hoverbox. In this case, we
    // could just use clientX/clientY.
    const deltaX = e.screenX - s.initScreenX;
    const deltaY = e.screenY - s.initScreenY;
    const initClientPt = frameToClientPt(new Pt(s.initPageX, s.initPageY), vc);
    if (!s.isDragging) {
      if (Math.sqrt(deltaX ** 2 + deltaY ** 2) >= minDragPx) {
        // ignore fixed elements, we do this verification here, because we want to warn
        // the user only when he tries to drag
        const focusedTpl = vc.focusedTpl();
        if (
          focusedTpl &&
          (isKnownTplTag(focusedTpl) || isKnownTplComponent(focusedTpl))
        ) {
          const position = this.viewOps().getPositionType(focusedTpl);
          if (position === PositionLayoutType.fixed) {
            this.throttledWarn({
              message:
                "You cannot drag a fixed element. Use the right menu to change the position.",
            });
            return;
          }
        }
        if (focusedTpl && isTplTextBlock(focusedTpl.parent)) {
          this.throttledWarn({
            message:
              "You cannot drag an inline element from a rich-text block.",
          });
          return;
        }

        this.dragState = {
          ...s,
          isDragging: true,
        };
        vc.studioCtx.setIsDraggingObject(true);
        document.addEventListener("keydown", this.handleDragEscape);
        const focusObjs = vc.focusedSelectables();

        const filteredFocusObjs = focusObjs.filter((focusObj) => {
          if (focusObj instanceof ValNode) {
            const elts = vc.eltFinder(focusObj);
            if (elts == null || ensureArray(elts).length === 0) {
              // This is probably a functional code component that doesn't forward
              // ref and whose host app didn't setup the preamble.
              return false;
            }
          }
          return true;
        });

        if (
          focusObjs.length === 0 ||
          (focusObjs.length === 1 &&
            focusObjs[0] instanceof ValNode &&
            vc.getViewOps().isRootNodeOfFrame(focusObjs[0].tpl))
        ) {
          const frame = vc.arenaFrame();
          if (isPositionManagedFrame(vc.studioCtx, frame)) {
            return;
          }

          // When dragging the root, just drag the whole frame instead
          const dragMoveManager = new DragMoveFrameManager(
            vc.studioCtx,
            frame,
            initClientPt
          );
          this.dragState = {
            ...this.dragState,
            dragMoveManager,
          };
        } else {
          const tagAndCompObjs = filteredFocusObjs.filter(
            (obj) => obj instanceof ValTag || obj instanceof ValComponent
          );
          const dragMoveManager = new DragMoveManager(
            vc,
            tagAndCompObjs as (ValTag | ValComponent)[],
            initClientPt
          );
          this.dragState = {
            ...this.dragState,
            dragMoveManager,
          };
        }
        console.log("dragState set to", this.dragState);
      }
    }
    if (s.dragMoveManager) {
      await s.dragMoveManager.drag(clientPt, e);
      if (s.dragMoveManager && s.dragMoveManager.aborted()) {
        this.endDrag();
      }
    }
  }

  private handleDragEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (this.dragState) {
        this.endDrag();
      }
    }
  };

  private endDrag() {
    const s = ensure(this.dragState, () => "Expected dragState to exist");
    if (s.dragMoveManager) {
      s.dragMoveManager.endDrag();
    }
    this.dragState = undefined;
    document.removeEventListener("keydown", this.handleDragEscape);
    this.props.studioCtx.setIsDraggingObject(false);
  }

  private handleMouseOut = (e: MouseEvent, vc?: ViewCtx) => {
    if (
      this.props.studioCtx.isLiveMode ||
      this.props.studioCtx.isInteractiveMode
    ) {
      return;
    }
    if (vc) {
      vc.change(() => {
        vc.getViewOps().tryHoverObj(undefined, { exact: true });
        vc.setMeasureToolDomElt(null);
      });
    }
  };

  private handleMouseOver = (e: MouseEvent, focusedVc?: ViewCtx) => {
    this.genericHandleMouseOver(e, focusedVc);
  };

  private genericHandleMouseOver = (
    e: MouseEvent,
    focusedVc: ViewCtx | null | undefined
  ) => {
    const sc = this.props.studioCtx;
    if (sc.isLiveMode || sc.isInteractiveMode) {
      return;
    }
    const r = this.extractEventTarget(e, focusedVc);
    if (!r) {
      return;
    }
    const [$target, targetVc] = r;
    if (!targetVc) {
      // mouse visually moved out of the iframe
      if (focusedVc) {
        focusedVc.change(() =>
          focusedVc.getViewOps().tryHoverObj(undefined, { exact: true })
        );
      }
      return;
    }
    const $hovered = targetVc.$hoveredDomElt();
    if (!$hovered || !$target.is($hovered)) {
      targetVc.change(() => {
        if ($target.is(".__wab_root")) {
          targetVc.getViewOps().tryHoverObj(undefined, { exact: true });
          targetVc.setMeasureToolDomElt(null);
        } else {
          targetVc.getViewOps().tryHoverDomElt($target, { exact: false });
        }
      });
    }

    // Measure Tool computations
    const $focusedDomElt = maybe(focusedVc, (vc) => vc.focusedDomElt());
    const arenaBounds = new Box(
      0,
      0,
      targetVc.arenaFrame().width,
      getFrameHeight(targetVc.arenaFrame())
    );
    const cursorPt = new Pt(e.clientX, e.clientY);
    const $measureTool = targetVc.$measureToolDomElt();
    this.measureToolTargets = $focusedDomElt
      ? {
          targetDom:
            $target &&
            (!$measureTool ||
              $measureTool instanceof Pt ||
              !$target.is($measureTool))
              ? $target
              : undefined,
          targetPt: arenaBounds.contains(cursorPt)
            ? cursorPt.moveBy(
                targetVc.arenaFrame().left ?? 0,
                targetVc.arenaFrame().top ?? 0
              )
            : undefined,
          targetVc: targetVc,
        }
      : undefined;
    this.drawMeasureTool();
  };

  private drawMeasureTool = () => {
    if (!this.measureToolTargets) {
      return;
    }

    const sc = this.props.studioCtx;
    const { targetDom, targetPt, targetVc } = this.measureToolTargets;
    const $measureTool = targetVc.$measureToolDomElt();
    if (
      sc.isAltDown() &&
      !sc.isShiftDown() &&
      !sc.isMetaDown() &&
      !sc.isCtrlDown() &&
      targetDom
    ) {
      // Set DOM element as the target
      targetVc.setMeasureToolDomElt(targetDom);
    } else if (sc.isAltDown() && sc.isShiftDown() && targetPt) {
      // Set the adjusted cursor as the target
      targetVc.setMeasureToolDomElt(targetPt);
    } else if (!sc.isAltDown() && $measureTool !== null) {
      // Clear MeasureTool from view
      targetVc.setMeasureToolDomElt(null);
    }
  };

  private handleMouseUp(e: MouseEvent, vc: ViewCtx | undefined | null) {
    if (this.props.studioCtx.isPanning()) {
      this.props.studioCtx.endPanning();
      e.preventDefault(); // avoid generating a paste event on Linux
    }
    if (
      !vc ||
      this.props.studioCtx.isLiveMode ||
      this.props.studioCtx.isInteractiveMode
    ) {
      return;
    }
    // ignore the events if we are in freestyle mode
    if (this.props.studioCtx.freestyleState()) {
      return;
    }
    const s = this.dragState;
    if (s) {
      this.endDrag();
    }
  }

  private handleContextMenu = (e: MouseEvent, focusedVc?: ViewCtx) => {
    if (
      this.props.studioCtx.isLiveMode ||
      this.props.studioCtx.isInteractiveMode ||
      !focusedVc
    ) {
      return;
    }
    const r = this.extractEventTarget(e, focusedVc);
    if (!r) {
      return;
    }
    const [$target, targetVc] = r;
    if (!targetVc) {
      return;
    }

    const { val } = targetVc.getViewOps().getFinalFocusable($target);

    targetVc.change(() => {
      if (val) {
        const tpl = val instanceof ValNode ? val.tpl : val.getTpl();
        const focusedTpls = targetVc.focusedTpls();
        if (!focusedTpls.some((ftpl) => ftpl === tpl)) {
          targetVc.getViewOps().tryFocusObj(val, { exact: false });
        }
      } else {
        targetVc.setStudioFocusByTpl(null);
      }
    });

    targetVc.tryBlurEditingText();
    const menu = getContextMenuForFocusedTpl(targetVc);

    e.preventDefault();
    e.stopPropagation();

    // This event originated from within the frame, so we can't just pass it
    // directly into showContextMenu(), as the menu dropdown will be created
    // in the Studio frame, but the event coordinates are from the artboard
    // frame.  So instead, we translate the event coordinates to the outer
    // Studio frame
    const outerClientPt = frameToClientPt(
      new Pt(e.clientX, e.clientY),
      targetVc
    );

    // And then we can use this directly as the pageX/pageY, because the
    // Studio frame has no scrolling so the two are the same.
    maybeShowContextMenu(e, menu, {
      pageX: outerClientPt.x,
      pageY: outerClientPt.y,
    });
  };

  private isZoomOverlay = ($target: JQuery) => {
    return (
      $target.is(".CanvasFrame__OverlayTop") ||
      $target.is(".CanvasFrame__OverlayLeft") ||
      $target.is(".CanvasFrame__OverlayRight") ||
      $target.is(".CanvasFrame__OverlayBottom")
    );
  };

  private extractEventTarget(
    e: MouseEvent,
    focusedVc: ViewCtx | undefined | null
  ): [JQuery, ViewCtx | undefined] | undefined {
    const $target = $(e.target as HTMLElement);
    if (this.isZoomOverlay($target) || isCanvasOverlay($target)) {
      const frameUid = +ensure(
        $target.attr("data-frame-uid"),
        "Expected attr data-frame-uid to exist"
      );
      const targetVc = this.props.studioCtx.viewCtxs.find(
        (v) => v.arenaFrame().uid === frameUid
      );
      if (!targetVc) {
        // It's possible for the frame to exist but not the ViewCtx, because the
        // frame is not loaded yet
        return;
      }
      const $tplRoot = targetVc.canvasCtx.$eltForTplRoot();
      if ($tplRoot.length === 0) {
        // the frame hasn't been fully rendered yet
        return undefined;
      }
      if (isCanvasOverlay($target)) {
        const actualTargetElt = targetVc.canvasCtx
          .$doc()
          .get(0)
          .elementsFromPoint(e.clientX, e.clientY)[1];
        return actualTargetElt && [$(actualTargetElt as HTMLElement), targetVc];
      }

      const clientPt = new Pt(e.clientX, e.clientY);
      const iframeBound = Box.fromRect(
        targetVc.canvasCtx.viewport().getBoundingClientRect()
      );
      if (!iframeBound.contains(clientPt)) {
        // Due to precision problem, the overlay may cover portions outside the
        // iframe. This check ensures the point is in the iframe.
        return [$(".canvas-editor__canvas-clipper"), undefined];
      }
      // Bound of tplRoot in iFrame
      const tplRootBound = Box.fromRect(getElementBounds($tplRoot));
      const framePt = clientToFramePt(
        new Pt(e.clientX, e.clientY),
        targetVc,
        false
      );
      const $targetElt = tplRootBound.contains(framePt)
        ? $tplRoot
        : targetVc.canvasCtx.$userBody();
      return tuple($targetElt, targetVc);
    }

    // ignore all mousedown events if not from the left button.
    // ignore events from dev-env, which handles events by themselves.
    // ignore events if there is no viewCtx.
    if (!focusedVc || $target.parents().is(".dev-env")) {
      return undefined;
    }

    const $body = focusedVc.canvasCtx.$body();
    if (!$target.is($body) && !$target.parents().is($body)) {
      return undefined;
    }

    return tuple($target, focusedVc);
  }

  private makeAlert = () => {
    const { studioCtx } = this.props;
    const freestyleState = studioCtx.freestyleState();
    const dragInsertState = studioCtx.dragInsertState();
    if (freestyleState) {
      return (
        <div className="canvas-editor__floating-msg no-pointer-events">
          <Alert
            message={`Click where you want to insert a new ${freestyleState.spec.label} element.`}
          />
        </div>
      );
    }
    if (dragInsertState) {
      return (
        <div className="canvas-editor__floating-msg no-pointer-events">
          <Alert
            message={`Click where you want to insert a new ${dragInsertState.spec.label} element.`}
          />
        </div>
      );
    }
    if (!studioCtx.currentArena || studioCtx.currentArenaEmpty) {
      assert(
        !isComponentArena(studioCtx.currentArena),
        `Component arenas cannot be empty`
      );
      return (
        <div className="canvas-editor__floating-msg">
          <Alert
            message={
              isMixedArena(studioCtx.currentArena)
                ? `This ${ARENA_LOWER} is empty.`
                : isPageArena(studioCtx.currentArena)
                ? `This page is empty.`
                : "This project is empty."
            }
            description={
              !studioCtx.currentArena ||
              isMixedArena(studioCtx.currentArena) ? (
                <>
                  {isMixedArena(studioCtx.currentArena) && (
                    <p>{ARENAS_DESCRIPTION}</p>
                  )}
                  <p>
                    You can create a{" "}
                    <widgets.LinkButton
                      onClick={() =>
                        studioCtx.siteOps().createFrameForNewPage()
                      }
                    >
                      new page
                    </widgets.LinkButton>{" "}
                    or a{" "}
                    <widgets.LinkButton
                      onClick={() =>
                        studioCtx.siteOps().createFrameForNewComponent()
                      }
                    >
                      new component
                    </widgets.LinkButton>{" "}
                    to get started!
                  </p>
                </>
              ) : isPageArena(studioCtx.currentArena) ? (
                <>
                  <p>
                    You can add artboards to with different screen sizes for
                    viewing your page.
                  </p>
                  <p>
                    <DropdownButton
                      type="primary"
                      menu={() =>
                        makeFrameSizeMenu({
                          studioCtx,
                          onClick: (size) => {
                            spawn(
                              studioCtx.changeUnsafe(() => {
                                studioCtx
                                  .siteOps()
                                  .addScreenSizeToPageArenas(size);
                              })
                            );
                          },
                        })
                      }
                    >
                      Add a screen size
                    </DropdownButton>
                  </p>
                </>
              ) : null
            }
          />
        </div>
      );
    }
    return null;
  };

  private handleDelete(
    e: KeyboardEvent,
    { forceDelete }: { forceDelete: boolean }
  ) {
    return this.handleHotkey(e, async () => {
      const currentArena = this.props.studioCtx.currentArena;
      const focusedArenaFrame = this.props.studioCtx.focusedFrame();

      if (
        focusedArenaFrame &&
        !(
          isDedicatedArena(currentArena) &&
          isBaseVariantFrame(this.props.studioCtx.site, focusedArenaFrame)
        )
      ) {
        // delete the frame
        await this.siteOps().removeArenaFrame(focusedArenaFrame!);
      } else {
        await this.ensureViewCtx().getViewOps().tryDelete({ forceDelete });
      }
    });
  }

  private onFrameLoad = (frame: ArenaFrame, canvasCtx: CanvasCtx) => {
    const studioCtx = this.props.studioCtx;

    // Intentionally using runInAction instead of studioCtx.change(). The
    // reason is that in studioCtx.restoreUndoRecord(), we await the creation
    // of viewCtx.  But studioCtx.restoreUndoRecord() itself is run within
    // studioCtx.change(), and only one change() can run at a time.  That means
    // while we're restoring undo record, and we need to create a new artboard
    // (say, undoing the deletion of an artboard), we yield.  Eventually artboard
    // gets created, and onFrameLoad is called here, and if we use
    // studioCtx.change() to create and add the new ViewCtx, it'll be queued
    // till the current change function is done. But current change function
    // will never be done, as it is waiting for the creation of ViewCtx!
    //
    // It is okay to use runInAction instead of studioCtx.change() here, as
    // `createViewCtx` supports it and there are no other changes to the data
    // model.
    runInAction(() => {
      const vc = studioCtx.createViewCtx(frame, canvasCtx);
      const doc = canvasCtx.$doc().get(0);

      // We use pointer events instead of mouse events because they fire first, and we want to try to block events from firing in the user app.
      // We may even eventually want to be more aggressively capturing pointer events. This would let us prevent more listeners from the user app from firing.
      doc.addEventListener("pointerdown", (e) =>
        spawn(this.handleMouseDown(e, vc))
      );
      doc.addEventListener("pointerup", (e) => this.handleMouseUp(e, vc));
      doc.addEventListener("pointermove", (e) =>
        spawn(this.handleMouseMove(e, vc))
      );
      doc.addEventListener("pointerover", (e) => this.handleMouseOver(e, vc));
      doc.addEventListener("pointerout", (e) => this.handleMouseOut(e, vc));
      doc.addEventListener("contextmenu", (e) => this.handleContextMenu(e, vc));
      doc.addEventListener("wheel", () =>
        document.dispatchEvent(new Event(plasmicIFrameWheelEvent))
      );
      canvasCtx
        .$body()
        // Handle drag-n-drop files into an artboard
        .on("drop", (e) => {
          spawn(
            this.handleDrop(
              ensure(e.originalEvent, () => "Expected originalEvent to exist")
            )
          );
        })
        .on("dragenter", (e) =>
          this.handleDragEnter(
            ensure(e.originalEvent, () => "Expected originalEvent to exist")
          )
        )
        .on("dragover", (e) => e.preventDefault())
        .on("dragleave", (e) =>
          this.handleDragLeave(
            ensure(e.originalEvent, () => "Expected originalEvent to exist")
          )
        );
    });
  };

  render() {
    const { studioCtx } = this.props;

    const watchedPlayer = studioCtx.watchPlayerId
      ? studioCtx.multiplayerCtx.getPlayerDataById(studioCtx.watchPlayerId)
      : undefined;

    const disableRightPane =
      !!(DEVFLAGS.richtext2 && this.viewCtx()?.editingTextContext()) ||
      (this.viewCtx()?.focusedTpls().length ?? 0) > 1;

    return (
      <div className="canvas-editor">
        {studioCtx.currentArena && (
          <>
            <InsertPanelWrapper />
            <OmnibarOverlay />
          </>
        )}
        <GlobalCssVariables />
        <div className="canvas-editor__outer-main-area">
          <BrowserAlertBanner />
          <DevContainer className="canvas-editor__top-bar" showControls={true}>
            <TopBar />
            {!this.props.studioCtx.isLiveMode &&
              !this.props.studioCtx.isDocs && <TopFrameObserver />}
          </DevContainer>

          <div className="canvas-editor__hsplit">
            <LeftPane studioCtx={studioCtx} />
            <div
              className={cn("canvas-editor__canvas-container", {
                "canvas-editor__canvas-container__focus_mode":
                  studioCtx.focusedMode,
              })}
              onPointerDown={(e) => {
                if (
                  !studioCtx.isInteractiveMode &&
                  !studioCtx.isSpaceDown() &&
                  e.button === 0 &&
                  ((e.target instanceof Element &&
                    e.target.matches(".canvas-editor__canvas")) ||
                    $(e.target).parents().is(".canvas-editor__frames"))
                ) {
                  // Make sure that the onBlur events are called before resetting
                  // the focus.
                  maybeInstance(document.activeElement, HTMLElement, (ae) =>
                    ae.blur()
                  );
                  spawn(
                    studioCtx.changeUnsafe(() =>
                      studioCtx.setStudioFocusOnFrame(
                        // By clicking the empty area on the canvas, it will select
                        // the current frame if using focused mode, otherwise
                        // it'll just clear selection
                        {
                          frame: undefined,
                          autoZoom: false,
                        }
                      )
                    )
                  );
                }
              }}
              // Handle drag-n-drop files into blank canvas
              onDrop={async (e) => this.handleDrop(e)}
              // Prevents the file from being loaded in a new tab when dropped
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => this.handleDragEnter(e)}
              onDragLeave={(e) => this.handleDragLeave(e)}
              onMouseLeave={() => this.updateCursorLocation(null)}
              onMouseMove={(e) => this.updateCursorLocation(e)}
              onMouseDown={() => {
                this.props.studioCtx.setWatchPlayerId(null);
              }}
              onMouseUp={() => {
                this.props.studioCtx.setWatchPlayerId(null);
              }}
            >
              {watchedPlayer && (
                <MultiplayerFollowingBorder
                  className="canvas-editor__watch-mode"
                  name={watchedPlayer.user?.firstName ?? "Anon"}
                  hexColor={watchedPlayer.color}
                />
              )}
              {studioCtx.showDevControls && (
                <div className="canvas-editor__top-pane">
                  <div className="canvas-editor__top-pane__floating-elements-container">
                    {studioCtx.alertBannerState && (
                      <div className="canvas-editor__alert-banner-container">
                        <AlertBanner studioCtx={studioCtx} />
                      </div>
                    )}
                    {this.makeAlert()}
                  </div>
                </div>
              )}
              <div
                ref={this.canvasClipper}
                className="canvas-editor__canvas-clipper"
              >
                {studioCtx.isDevMode && (
                  <div className="canvas-editor__canvas-clipper-grid" />
                )}
                <div ref={this.canvas} className="canvas-editor__canvas">
                  <div
                    ref={this.canvasScaler}
                    className="canvas-editor__scaler"
                  >
                    {getSiteArenas(studioCtx.site, { noSorting: true }).map(
                      (arena) => (
                        <CanvasArenaShell
                          key={arena.uid}
                          arena={arena}
                          studioCtx={studioCtx}
                          onFrameLoad={this.onFrameLoad}
                        />
                      )
                    )}
                    <DevContainer
                      className="abs"
                      showControls={studioCtx.isDevMode}
                    >
                      <div className="canvas-editor__hoverbox-scroller">
                        {this.viewCtx() && (
                          <Spotlight viewCtx={this.ensureViewCtx()} />
                        )}
                        <PlayerBoxes />
                        {!studioCtx.isInteractiveMode && <CloneBoxes />}
                        {!DEVFLAGS.ancestorsBoxes &&
                          !studioCtx.isInteractiveMode &&
                          !studioCtx.appCtx.appConfig.ancestorsBoxes && (
                            <PreselectBox />
                          )}
                        {!studioCtx.isInteractiveMode &&
                          (DEVFLAGS.ancestorsBoxes ||
                            studioCtx.appCtx.appConfig.ancestorsBoxes) && (
                            <PreselectBoxes />
                          )}
                        {!studioCtx.isInteractiveMode && (
                          <HoverBoxes studioCtx={studioCtx} />
                        )}
                        <MeasureTool ref="measuretool" />
                        <FreestyleBox />
                        <input
                          className="hidden-image-selector"
                          type="file"
                          accept={".gif,.jpg,.jpeg,.png,.tif,.svg"}
                        />
                        <>
                          {!studioCtx.isInteractiveMode &&
                            this.props.studioCtx.viewCtxs.map((vc) => (
                              <DndMarkers
                                key={vc.arenaFrame().uid}
                                viewCtx={vc}
                              />
                            ))}
                        </>
                        {!studioCtx.isInteractiveMode && this.viewCtx() && (
                          <>
                            <DndAdoptee key="dnd-adoptee" />
                          </>
                        )}
                        <div
                          className={
                            studioCtx.dragInsertState() ? "DragInsertState" : ""
                          }
                        />
                      </div>
                    </DevContainer>
                  </div>
                  <div className="canvas-editor__viewport-click-guard" />
                  <CanvasDndOverlay opts={this.dndOverlayOpts} />
                </div>
                {!studioCtx.focusedMode && <VariantsBar />}
              </div>
              {DEVFLAGS.richtext2 && this.viewCtx()?.editingTextContext() && (
                <RichTextToolbar
                  ctx={ensure(
                    this.viewCtx()?.editingTextContext(),
                    () => "Expected editingTextContent to exist"
                  )}
                />
              )}
              {DEVFLAGS.codePreview && (
                <CodePreviewPanel studioCtx={studioCtx} />
              )}
              <PlayerCursors />
              <FocusedModeToolbar studioCtx={studioCtx} />
            </div>
            <RightPane studioCtx={studioCtx} disabled={disableRightPane} />
          </div>

          <DevContainer
            showControls={studioCtx.showDevControls}
            defaultHidden={true}
            className={cx({
              "canvas-editor__bottom-pane": true,
              "canvas-editor__bottom-pane--expanded": false,
            })}
          />
        </div>
        {studioCtx.isDraggingObject() &&
          !this.dragState &&
          createPortal(<div className="drag-guard" />, document.body)}
        {studioCtx.showPageSettings && (
          <TopModal
            onClose={() =>
              studioCtx.changeUnsafe(
                () => (studioCtx.showPageSettings = undefined)
              )
            }
          >
            <PageSettings page={studioCtx.showPageSettings} />
          </TopModal>
        )}
        <BottomModals
          onFocusedIndexChange={(newIndex) =>
            studioCtx.setFocusedBottomModalIndex(newIndex)
          }
        />
      </div>
    );
  }
}
export const ViewEditor = observer(ViewEditor_);

const RightPane = observer(function RightPane(props: {
  studioCtx: StudioCtx;
  disabled?: boolean;
}) {
  const { studioCtx, disabled } = props;
  const appConfig = studioCtx.appCtx.appConfig;
  const focusedViewCtx = studioCtx.focusedViewCtx();
  const [hover, setHover] = React.useState(false);
  const showComponentTab = appConfig.rightTabs && !!focusedViewCtx;
  const showStylingTab =
    appConfig.rightTabs && focusedViewCtx && !studioCtx.focusedFrame();
  const showSettingsTab =
    appConfig.rightTabs && focusedViewCtx && !studioCtx.focusedFrame();

  const focusedComponent = getFocusedComponentFromViewCtxOrArena(
    studioCtx,
    focusedViewCtx
  );

  const tabs = withoutNils([
    showSettingsTab
      ? new widgets.Tab({
          name: "Settings",
          key: RightTabKey.settings,
          contents: () => <SettingsTab />,
        })
      : null,
    showStylingTab
      ? new widgets.Tab({
          name: "Design",
          key: RightTabKey.style,
          contents: () => (
            <StyleTabContext.Provider
              value={appConfig.rightTabs ? "style-only" : "all"}
            >
              <StyleTab studioCtx={studioCtx} viewCtx={focusedViewCtx} />
            </StyleTabContext.Provider>
          ),
        })
      : null,
    DEVFLAGS.demo && focusedViewCtx
      ? new widgets.Tab({
          name: "Old Settings",
          key: RightTabKey["old-settings"],
          contents: () => <OldSettingsTab viewCtx={focusedViewCtx} />,
        })
      : null,
    !showComponentTab
      ? null
      : new widgets.Tab({
          name: maybe(focusedComponent, isPageComponent)
            ? "Page data"
            : "Component data",
          key: RightTabKey.component,
          contents: () => (
            <ComponentOrPageTab
              studioCtx={studioCtx}
              viewCtx={focusedViewCtx}
            />
          ),
        }),
  ]);

  React.useEffect(() => {
    if (tabs.length === 1) {
      studioCtx.rightTabKey = tabs[0].key as RightTabKey;
    }
  }, [tabs.length]);

  return providesSidebarPopupSetting({ left: false })(
    <DevContainer
      className={cx({
        "canvas-editor__right-pane": true,
        "canvas-editor__right-pane-box-shadow": !studioCtx.watchPlayerId,
        dimfg: true,
        monochrome: !hover,
      })}
      showControls={studioCtx.showDevControls}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {disabled && <div className="canvas-editor__disable-right-pane" />}
      {DEVFLAGS.demo || appConfig.comments || appConfig.rightTabs ? (
        studioCtx.showCommentsPanel ? (
          <CommentsTab />
        ) : (
          <widgets.Tabs
            onSwitch={(tabKey: RightTabKey) => {
              studioCtx.rightTabKey = tabKey;
              studioCtx.tourActionEvents.dispatch({
                type: TutorialEventsType.RightTabSwitched,
                params: {
                  tabKey,
                },
              });
            }}
            tabKey={studioCtx.rightTabKey}
            useDefaultClasses={false}
            tabBarClassName="hilite-tabs"
            tabClassName="hilite-tab"
            activeTabClassName="hilite-tab--active"
            tabs={tabs}
          />
        )
      ) : (
        <StyleTab studioCtx={studioCtx} viewCtx={focusedViewCtx} />
      )}
    </DevContainer>
  );
});

function pasteFromFigma(
  vc: ViewCtx | undefined,
  sc: StudioCtx,
  itemToPaste: PastableItem,
  relLoc: InsertRelLoc | undefined,
  cursorClientPt: Pt | undefined
) {
  assert(
    itemToPaste?.type === "figma",
    "Should only be called if this is a figma paste"
  );
  const showFigmaError = () => {
    notification.error({
      message: "No Figma layers to paste",
      description:
        "This could happen if (for example) the entire selection was invisible in Figma. If you aren't expecting this behavior, please share the Figma file with team@plasmic.app.",
    });
  };
  if (vc) {
    const vtm = vc.variantTplMgr();
    const maybeNode = tplNodeFromFigmaData(
      vtm,
      sc.site,
      sc.siteOps(),
      itemToPaste.nodes,
      itemToPaste.uploadedImages,
      itemToPaste.nodeImages,
      itemToPaste.imagesToRename,
      itemToPaste.replaceComponentInstances
    );
    if (maybeNode) {
      vc.getViewOps().pasteNode(maybeNode, cursorClientPt, undefined, relLoc);
      extractUsedFontsFromComponents(sc.site, [vc.component]).forEach((usage) =>
        sc.fontManager.useFont(sc, usage.fontFamily)
      );
    } else {
      showFigmaError();
    }
  } else {
    // No existing artboard, so paste the Figma content as its own artboard
    const arena = sc.currentArena;
    if (!isMixedArena(arena)) {
      notification.error({
        message: `Please select where you want to paste. (If you want to paste multiple Figma artboards, create a ${ARENA_LOWER}.)`,
      });
      return;
    }
    const newComponent = sc
      .tplMgr()
      .addComponent({ type: ComponentType.Frame });
    const newFrame = sc.siteOps().createNewFrameForMixedArena(newComponent);
    const tplMgr = sc.tplMgr();
    const vtm = new VariantTplMgr(
      [new RootComponentVariantFrame(newFrame)],
      sc.site,
      sc.tplMgr(),
      new GlobalVariantFrame(sc.site, newFrame)
    );
    const maybeNode = tplNodeFromFigmaData(
      vtm,
      sc.site,
      sc.siteOps(),
      itemToPaste.nodes,
      itemToPaste.uploadedImages,
      itemToPaste.nodeImages,
      itemToPaste.imagesToRename,
      itemToPaste.replaceComponentInstances
    );
    if (!maybeNode) {
      // Paste was unsuccessful, so delete the new frame / component we made :-/
      showFigmaError();
      tplMgr.removeExistingArenaFrame(arena, newFrame, {
        pruneUnnamedComponent: true,
      });
      return;
    }
    newComponent.tplTree = maybeNode;
    trackComponentRoot(newComponent);
    if (isTplVariantable(newComponent.tplTree)) {
      const rsh = RSH(
        vtm.ensureBaseVariantSetting(newComponent.tplTree).rs,
        newComponent.tplTree
      );
      const widthParsed = parseCssNumericNew(rsh.get("width"));
      const heightParsed = parseCssNumericNew(rsh.get("height"));
      if (
        widthParsed &&
        widthParsed.units === "px" &&
        heightParsed &&
        heightParsed.units === "px"
      ) {
        const width = widthParsed.num;
        const height = heightParsed.num;
        const area = width * height;
        if (area >= 400 * 700) {
          // We're just going to guess that a frame of at least iphone size
          // is a "page". We set frame to stretch mode, and set the root
          // element dimensions to stretch instead
          newFrame.width = width;
          newFrame.height = height;
          newFrame.viewMode = FrameViewMode.Stretch;
          rsh.set("width", "stretch");
          rsh.set("height", "stretch");
        } else {
          newFrame.width = width + CENTERED_FRAME_PADDING * 2;
          newFrame.height = height + CENTERED_FRAME_PADDING * 2;
        }
      }
    }
    sc.setStudioFocusOnFrame({ frame: newFrame, autoZoom: true });
    extractUsedFontsFromComponents(sc.site, [newComponent]).forEach((usage) =>
      sc.fontManager.useFont(sc, usage.fontFamily)
    );
  }
}

function makeBackgroundImageProps(asset: ImageAsset) {
  return {
    background: mkBackgroundLayer(
      new ImageBackground({ url: mkImageAssetRef(asset) })
    ).showCss(),
  };
}
